
from datetime import datetime
from decimal import Decimal
from io import BytesIO
from xml.sax.saxutils import escape

from django.db.models import Count
from django.http import FileResponse, HttpResponse

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from schedules.models import Schedule, TreatmentRecord
from schedules.serializers import ScheduleSerializer
from patients.models import Patient, PatientMedicalProfile

from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    PageBreak,
)
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.units import mm

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter


# =========================================================
# GENERAL HELPERS
# =========================================================

def display_value(value, fallback="Not recorded"):
    """Return a readable value without inventing missing data."""
    if value is None or value == "":
        return fallback

    if isinstance(value, bool):
        return "Yes" if value else "No"

    if isinstance(value, Decimal):
        return str(value)

    return str(value)


def parse_report_date(value, field_name):
    """Validate a date supplied as YYYY-MM-DD."""
    if not value:
        raise ValidationError({
            field_name: f"{field_name} is required."
        })

    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise ValidationError({
            field_name: "Use the YYYY-MM-DD date format."
        })


def get_patient_name(patient):
    if not patient:
        return "Unknown patient"

    return " ".join(
        part for part in [
            patient.first_name,
            patient.middle_name,
            patient.last_name,
        ]
        if part
    ).strip() or patient.patient_id


def get_machine_name(schedule):
    machine = getattr(schedule, "machine", None)

    if not machine:
        return "Not recorded"

    return (
        getattr(machine, "machine_number", None)
        or getattr(machine, "name", None)
        or str(machine)
    )


def get_staff_name(schedule):
    staff = getattr(schedule, "staff", None)

    if not staff:
        return "Not recorded"

    name = " ".join(
        part for part in [
            getattr(staff, "first_name", ""),
            getattr(staff, "last_name", ""),
        ]
        if part
    ).strip()

    return name or str(staff)


def get_user_label(user):
    if not user:
        return "Not recorded"

    return (
        getattr(user, "get_full_name", lambda: "")()
        or getattr(user, "username", "")
        or str(user)
    )


# =========================================================
# REPORT FILTERING
# =========================================================

def get_filtered_schedules(request):
    """
    Shared filtering for the on-screen report, PDF, and Excel.

    Query parameters:
        scope=all|patient
        patient_id=<Patient database ID>
        status=All|Scheduled|Completed|Cancelled|Missed
        date_mode=single|day|range|all
        date=YYYY-MM-DD
        start_date=YYYY-MM-DD
        end_date=YYYY-MM-DD
    """

    queryset = Schedule.objects.select_related(
        "patient",
        "patient__medical_profile",
        "machine",
        "staff",
        "treatment_record",
        "completed_by",
        "treatment_record__created_by",
        "treatment_record__updated_by",
    )

    scope = request.query_params.get("scope", "all")

    if scope == "patient":
        patient_id = request.query_params.get("patient_id")

        if not patient_id:
            raise ValidationError({
                "patient_id": "Select a patient to generate this report."
            })

        queryset = queryset.filter(patient_id=patient_id)

    elif scope != "all":
        raise ValidationError({
            "scope": "Scope must be 'all' or 'patient'."
        })

    status_filter = request.query_params.get("status", "All")

    allowed_statuses = {
        "Scheduled",
        "Completed",
        "Cancelled",
        "Missed",
    }

    if status_filter.lower() != "all":
        matching_status = next(
            (
                allowed
                for allowed in allowed_statuses
                if allowed.lower() == status_filter.lower()
            ),
            None,
        )

        if not matching_status:
            raise ValidationError({
                "status": "Choose a valid dialysis session status."
            })

        queryset = queryset.filter(status=matching_status)

    date_mode = request.query_params.get("date_mode", "single")

    if date_mode in ("single", "day"):
        report_date = parse_report_date(
            request.query_params.get("date"),
            "date",
        )
        queryset = queryset.filter(dialysis_date=report_date)

    elif date_mode == "range":
        start_date = parse_report_date(
            request.query_params.get("start_date"),
            "start_date",
        )
        end_date = parse_report_date(
            request.query_params.get("end_date"),
            "end_date",
        )

        if start_date > end_date:
            raise ValidationError({
                "date_range": "Start date cannot be after end date."
            })

        queryset = queryset.filter(
            dialysis_date__gte=start_date,
            dialysis_date__lte=end_date,
        )

    elif date_mode != "all":
        raise ValidationError({
            "date_mode": "Use 'single', 'range', or 'all'."
        })

    return queryset.order_by(
        "dialysis_date",
        "dialysis_time",
        "id",
    )


# =========================================================
# PATIENT AND MEDICAL PROFILE DATA
# =========================================================

def get_patient_details(patient):
    """Return patient demographic details from the existing model."""

    return {
        "id": patient.id,
        "patient_id": display_value(patient.patient_id),
        "full_name": get_patient_name(patient),
        "birth_date": display_value(patient.birth_date),
        "age": patient.age,
        "gender": display_value(patient.gender),
        "blood_type": display_value(patient.blood_type),
        "contact_number": display_value(patient.contact_number),
        "email": display_value(patient.email),
        "address": display_value(patient.address),
        "emergency_contact": display_value(patient.emergency_contact),
        "status": display_value(patient.status),
        "registered_at": display_value(patient.created_at),
    }


def get_medical_profile_details(patient):
    """
    Return the patient's currently recorded medical profile.
    This is not a historical snapshot of previous profile changes.
    """

    try:
        profile = patient.medical_profile
    except PatientMedicalProfile.DoesNotExist:
        return {
            "available": False,
            "weight": "Not recorded",
            "dialysis_frequency": "Not recorded",
            "dialysis_duration": "Not recorded",
            "preferred_shift": "Not recorded",
            "vascular_access": "Not recorded",
            "diabetes": "Not recorded",
            "hypertension": "Not recorded",
        }

    return {
        "available": True,
        "weight": display_value(profile.weight),
        "dialysis_frequency": display_value(
            profile.dialysis_frequency
        ),
        "dialysis_duration": display_value(
            profile.dialysis_duration
        ),
        "preferred_shift": display_value(profile.preferred_shift),
        "vascular_access": display_value(profile.vascular_access),
        "diabetes": display_value(profile.diabetes),
        "hypertension": display_value(profile.hypertension),
    }


# =========================================================
# TREATMENT RECORD DATA
# =========================================================

def get_treatment_record_details(schedule):
    """
    Retrieve measurements only from an actual TreatmentRecord.
    Missing measurements are never inferred from the schedule.
    """

    try:
        record = schedule.treatment_record
    except TreatmentRecord.DoesNotExist:
        record = None

    if not record:
        return {
            "available": False,
            "pre_weight": "Not recorded",
            "post_weight": "Not recorded",
            "blood_pressure_before": "Not recorded",
            "blood_pressure_after": "Not recorded",
            "pulse_before": "Not recorded",
            "pulse_after": "Not recorded",
            "notes": "No treatment record available.",
            "created_by": "Not recorded",
            "updated_by": "Not recorded",
            "created_at": "Not recorded",
            "updated_at": "Not recorded",
        }

    return {
        "available": True,
        "pre_weight": display_value(record.pre_weight),
        "post_weight": display_value(record.post_weight),
        "blood_pressure_before": display_value(
            record.blood_pressure_before
        ),
        "blood_pressure_after": display_value(
            record.blood_pressure_after
        ),
        "pulse_before": display_value(record.pulse_before),
        "pulse_after": display_value(record.pulse_after),
        "notes": display_value(record.notes),
        "created_by": get_user_label(record.created_by),
        "updated_by": get_user_label(record.updated_by),
        "created_at": display_value(record.created_at),
        "updated_at": display_value(record.updated_at),
    }


def get_schedule_report_record(schedule, serialized_record=None):
    """Combine schedule, patient, profile, and treatment information."""

    patient = schedule.patient

    result = dict(serialized_record or {})

    result.update({
        "patient_name": get_patient_name(patient),
        "patient_id": patient.patient_id,
        "patient_details": get_patient_details(patient),
        "patient_medical_profile": get_medical_profile_details(
            patient
        ),
        "machine_name": get_machine_name(schedule),
        "staff_name": get_staff_name(schedule),
        "schedule_notes": display_value(schedule.notes),
        "completed_by_name": get_user_label(schedule.completed_by),
        "completed_at": display_value(schedule.completed_at),
        "completion_override_reason": display_value(
            schedule.completion_override_reason
        ),
        "treatment_record": get_treatment_record_details(schedule),
    })

    return result


# =========================================================
# SUMMARY AND REPORT TITLE
# =========================================================

def get_report_summary(schedules):
    total = schedules.count()
    completed = schedules.filter(status="Completed").count()

    return {
        "total": total,
        "completed": completed,
        "scheduled": schedules.filter(status="Scheduled").count(),
        "cancelled": schedules.filter(status="Cancelled").count(),
        "missed": schedules.filter(status="Missed").count(),
        "patients": schedules.values("patient_id").distinct().count(),
        "with_treatment_records": schedules.filter(
            treatment_record__isnull=False
        ).count(),
        "without_treatment_records": schedules.filter(
            treatment_record__isnull=True
        ).count(),
        "completion_rate": round(
            (completed / total * 100) if total else 0,
            2,
        ),
    }


def get_report_title(request):
    scope = request.query_params.get("scope", "all")
    status_filter = request.query_params.get("status", "All")
    date_mode = request.query_params.get("date_mode", "single")

    scope_label = (
        "Patient Report"
        if scope == "patient"
        else "All Patients Report"
    )

    status_label = (
        "All Statuses"
        if status_filter.lower() == "all"
        else f"{status_filter.title()} Sessions"
    )

    if date_mode == "all":
        date_label = "All Available Dates"
    elif date_mode == "range":
        date_label = (
            f"{request.query_params.get('start_date', '')} to "
            f"{request.query_params.get('end_date', '')}"
        )
    else:
        date_label = request.query_params.get("date", "")

    return f"{scope_label} - {status_label} - {date_label}"


def get_unique_patient_rows(schedules):
    """Get one patient/profile row per patient in the report."""

    patients_by_id = {}

    for schedule in schedules:
        patient = schedule.patient

        if patient.id not in patients_by_id:
            patients_by_id[patient.id] = patient

    return [
        (
            get_patient_details(patient),
            get_medical_profile_details(patient),
        )
        for patient in patients_by_id.values()
    ]


# =========================================================
# PDF HELPERS
# =========================================================

def pdf_text(value):
    """Escape values before placing them inside ReportLab Paragraphs."""
    return escape(display_value(value))


def make_pdf_table(data, col_widths, header=True, font_size=7):
    table = Table(
        data,
        colWidths=col_widths,
        repeatRows=1 if header else 0,
        hAlign="LEFT",
    )

    style = [
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D1D5DB")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("FONTSIZE", (0, 0), (-1, -1), font_size),
    ]

    if header and data:
        style.extend([
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.HexColor("#166534"),
            ),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ])

    table.setStyle(TableStyle(style))
    return table


def build_pdf_report(request, schedules, summary):
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=12 * mm,
        leftMargin=12 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
    )

    styles = getSampleStyleSheet()
    small_style = ParagraphStyle(
        "ReportSmall",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=6.5,
        leading=8,
        alignment=TA_LEFT,
        wordWrap="CJK",
    )

    elements = []

    elements.append(Paragraph(
        "AI Dialysis System - Comprehensive Report",
        styles["Title"],
    ))
    elements.append(Paragraph(
        escape(get_report_title(request)),
        styles["Heading2"],
    ))
    elements.append(Spacer(1, 6))

    elements.append(Paragraph(
        (
            f"Total sessions: {summary['total']} | "
            f"Completed: {summary['completed']} | "
            f"Scheduled: {summary['scheduled']} | "
            f"Missed: {summary['missed']} | "
            f"Cancelled: {summary['cancelled']} | "
            f"Patients: {summary['patients']} | "
            f"Completion rate: {summary['completion_rate']}% | "
            f"With treatment records: "
            f"{summary['with_treatment_records']}"
        ),
        styles["Normal"],
    ))
    elements.append(Spacer(1, 10))

    # -----------------------------------------------------
    # Patient details and current medical profile
    # -----------------------------------------------------
    elements.append(Paragraph(
        "Patient Details and Current Medical Profiles",
        styles["Heading2"],
    ))

    patient_rows = [[
        "Patient ID",
        "Patient Name",
        "Age",
        "Gender",
        "Blood Type",
        "Contact",
        "Email",
        "Status",
    ]]

    profile_rows = [[
        "Patient ID",
        "Weight",
        "Frequency",
        "Duration",
        "Preferred Shift",
        "Vascular Access",
        "Diabetes",
        "Hypertension",
    ]]

    for patient_details, profile in get_unique_patient_rows(schedules):
        patient_rows.append([
            Paragraph(pdf_text(patient_details["patient_id"]), small_style),
            Paragraph(pdf_text(patient_details["full_name"]), small_style),
            pdf_text(patient_details["age"]),
            pdf_text(patient_details["gender"]),
            pdf_text(patient_details["blood_type"]),
            Paragraph(pdf_text(patient_details["contact_number"]), small_style),
            Paragraph(pdf_text(patient_details["email"]), small_style),
            pdf_text(patient_details["status"]),
        ])

        profile_rows.append([
            Paragraph(pdf_text(patient_details["patient_id"]), small_style),
            pdf_text(profile["weight"]),
            pdf_text(profile["dialysis_frequency"]),
            pdf_text(profile["dialysis_duration"]),
            pdf_text(profile["preferred_shift"]),
            Paragraph(pdf_text(profile["vascular_access"]), small_style),
            pdf_text(profile["diabetes"]),
            pdf_text(profile["hypertension"]),
        ])

    if len(patient_rows) == 1:
        patient_rows.append(["No patients in this report"] + [""] * 7)

    if len(profile_rows) == 1:
        profile_rows.append(["No profiles in this report"] + [""] * 7)

    elements.append(make_pdf_table(
        patient_rows,
        [58, 100, 30, 43, 45, 80, 115, 45],
        font_size=6.5,
    ))
    elements.append(Spacer(1, 8))
    elements.append(make_pdf_table(
        profile_rows,
        [65, 45, 55, 45, 70, 80, 45, 55],
        font_size=6.5,
    ))
    elements.append(Spacer(1, 12))

    # -----------------------------------------------------
    # Treatment history and clinical measurements
    # -----------------------------------------------------
    elements.append(Paragraph(
        "Dialysis Treatment History and Clinical Measurements",
        styles["Heading2"],
    ))

    treatment_rows = [[
        "Patient",
        "Date",
        "Time / Shift",
        "Machine",
        "Assigned Staff",
        "Status",
        "Weight Before / After",
        "BP Before / After",
        "Pulse Before / After",
        "Treatment Notes",
    ]]

    for schedule in schedules:
        treatment = get_treatment_record_details(schedule)

        treatment_rows.append([
            Paragraph(pdf_text(get_patient_name(schedule.patient)), small_style),
            pdf_text(schedule.dialysis_date),
            Paragraph(
                pdf_text(
                    f"{schedule.dialysis_time} / {schedule.shift}"
                ),
                small_style,
            ),
            Paragraph(pdf_text(get_machine_name(schedule)), small_style),
            Paragraph(pdf_text(get_staff_name(schedule)), small_style),
            pdf_text(schedule.status),
            Paragraph(
                pdf_text(
                    f"{treatment['pre_weight']} / "
                    f"{treatment['post_weight']}"
                ),
                small_style,
            ),
            Paragraph(
                pdf_text(
                    f"{treatment['blood_pressure_before']} / "
                    f"{treatment['blood_pressure_after']}"
                ),
                small_style,
            ),
            Paragraph(
                pdf_text(
                    f"{treatment['pulse_before']} / "
                    f"{treatment['pulse_after']}"
                ),
                small_style,
            ),
            Paragraph(pdf_text(treatment["notes"]), small_style),
        ])

    if len(treatment_rows) == 1:
        treatment_rows.append(["No treatment sessions found"] + [""] * 9)

    elements.append(make_pdf_table(
        treatment_rows,
        [85, 48, 63, 53, 72, 47, 68, 73, 60, 110],
        font_size=6.5,
    ))
    elements.append(Spacer(1, 10))

    # -----------------------------------------------------
    # Audit and schedule notes
    # -----------------------------------------------------
    elements.append(Paragraph(
        "Treatment Audit and Schedule Notes",
        styles["Heading2"],
    ))

    audit_rows = [[
        "Patient",
        "Date",
        "Completed By",
        "Completed At",
        "Treatment Record Created By",
        "Treatment Record Updated By",
        "Schedule Notes",
        "Override Reason",
    ]]

    for schedule in schedules:
        treatment = get_treatment_record_details(schedule)

        audit_rows.append([
            Paragraph(pdf_text(get_patient_name(schedule.patient)), small_style),
            pdf_text(schedule.dialysis_date),
            Paragraph(pdf_text(get_user_label(schedule.completed_by)), small_style),
            Paragraph(pdf_text(schedule.completed_at), small_style),
            Paragraph(pdf_text(treatment["created_by"]), small_style),
            Paragraph(pdf_text(treatment["updated_by"]), small_style),
            Paragraph(pdf_text(schedule.notes), small_style),
            Paragraph(
                pdf_text(schedule.completion_override_reason),
                small_style,
            ),
        ])

    if len(audit_rows) == 1:
        audit_rows.append(["No audit records found"] + [""] * 7)

    elements.append(make_pdf_table(
        audit_rows,
        [95, 50, 75, 70, 85, 85, 120, 100],
        font_size=6.5,
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer


# =========================================================
# EXCEL HELPERS
# =========================================================

def style_worksheet(sheet, header_row=1):
    header_fill = PatternFill(
        fill_type="solid",
        fgColor="166534",
    )

    for cell in sheet[header_row]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = header_fill
        cell.alignment = Alignment(
            horizontal="center",
            vertical="center",
            wrap_text=True,
        )

    for row in sheet.iter_rows():
        for cell in row:
            cell.alignment = Alignment(
                vertical="top",
                wrap_text=True,
            )

    if sheet.max_row >= header_row:
        sheet.freeze_panes = f"A{header_row + 1}"
        sheet.auto_filter.ref = (
            f"A{header_row}:{get_column_letter(sheet.max_column)}"
            f"{sheet.max_row}"
        )

    for column_cells in sheet.columns:
        column_letter = get_column_letter(column_cells[0].column)
        max_length = max(
            len(str(cell.value or ""))
            for cell in column_cells
        )

        sheet.column_dimensions[column_letter].width = min(
            max(max_length + 3, 12),
            42,
        )


def build_excel_report(request, schedules, summary):
    workbook = Workbook()

    # -----------------------------------------------------
    # Summary sheet
    # -----------------------------------------------------
    summary_sheet = workbook.active
    summary_sheet.title = "Summary"

    summary_sheet.append(["AI Dialysis System - Comprehensive Report"])
    summary_sheet.append([get_report_title(request)])
    summary_sheet.append([])
    summary_sheet.append(["Metric", "Value"])

    for label, value in [
        ("Total Sessions", summary["total"]),
        ("Completed", summary["completed"]),
        ("Scheduled", summary["scheduled"]),
        ("Missed", summary["missed"]),
        ("Cancelled", summary["cancelled"]),
        ("Patients in Report", summary["patients"]),
        ("With Treatment Records", summary["with_treatment_records"]),
        ("Without Treatment Records", summary["without_treatment_records"]),
        ("Completion Rate (%)", summary["completion_rate"]),
    ]:
        summary_sheet.append([label, value])

    style_worksheet(summary_sheet, header_row=4)

    # -----------------------------------------------------
    # Patient details sheet
    # -----------------------------------------------------
    patient_sheet = workbook.create_sheet("Patient Details")

    patient_sheet.append([
        "Database ID",
        "Patient ID",
        "Full Name",
        "Birth Date",
        "Age",
        "Gender",
        "Blood Type",
        "Contact Number",
        "Email",
        "Address",
        "Emergency Contact",
        "Account Status",
        "Registered At",
        "Current Weight",
        "Dialysis Frequency",
        "Dialysis Duration",
        "Preferred Shift",
        "Vascular Access",
        "Diabetes",
        "Hypertension",
        "Medical Profile Available",
    ])

    for patient_details, profile in get_unique_patient_rows(schedules):
        patient_sheet.append([
            patient_details["id"],
            patient_details["patient_id"],
            patient_details["full_name"],
            patient_details["birth_date"],
            patient_details["age"],
            patient_details["gender"],
            patient_details["blood_type"],
            patient_details["contact_number"],
            patient_details["email"],
            patient_details["address"],
            patient_details["emergency_contact"],
            patient_details["status"],
            patient_details["registered_at"],
            profile["weight"],
            profile["dialysis_frequency"],
            profile["dialysis_duration"],
            profile["preferred_shift"],
            profile["vascular_access"],
            profile["diabetes"],
            profile["hypertension"],
            profile["available"],
        ])

    style_worksheet(patient_sheet)

    # -----------------------------------------------------
    # Treatment history sheet
    # -----------------------------------------------------
    treatment_sheet = workbook.create_sheet("Treatment History")

    treatment_sheet.append([
        "Schedule ID",
        "Patient ID",
        "Patient Name",
        "Date",
        "Time",
        "Shift",
        "Machine",
        "Assigned Staff",
        "Status",
        "Schedule Notes",
        "Completed By",
        "Completed At",
        "Completion Override Reason",
        "Treatment Record Available",
        "Pre-treatment Weight",
        "Post-treatment Weight",
        "Blood Pressure Before",
        "Blood Pressure After",
        "Pulse Before",
        "Pulse After",
        "Treatment Notes",
        "Treatment Record Created By",
        "Treatment Record Updated By",
        "Treatment Record Created At",
        "Treatment Record Updated At",
    ])

    for schedule in schedules:
        treatment = get_treatment_record_details(schedule)

        treatment_sheet.append([
            schedule.id,
            schedule.patient.patient_id,
            get_patient_name(schedule.patient),
            str(schedule.dialysis_date),
            str(schedule.dialysis_time),
            schedule.shift,
            get_machine_name(schedule),
            get_staff_name(schedule),
            schedule.status,
            display_value(schedule.notes),
            get_user_label(schedule.completed_by),
            display_value(schedule.completed_at),
            display_value(schedule.completion_override_reason),
            treatment["available"],
            treatment["pre_weight"],
            treatment["post_weight"],
            treatment["blood_pressure_before"],
            treatment["blood_pressure_after"],
            treatment["pulse_before"],
            treatment["pulse_after"],
            treatment["notes"],
            treatment["created_by"],
            treatment["updated_by"],
            treatment["created_at"],
            treatment["updated_at"],
        ])

    style_worksheet(treatment_sheet)

    # Ensure useful column widths for long notes.
    for sheet in (patient_sheet, treatment_sheet):
        for row in sheet.iter_rows():
            for cell in row:
                cell.alignment = Alignment(
                    vertical="top",
                    wrap_text=True,
                )

    return workbook


# =========================================================
# ON-SCREEN REPORT API
# =========================================================

class DailyReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        schedules = get_filtered_schedules(request)
        summary = get_report_summary(schedules)

        serialized_records = ScheduleSerializer(
            schedules,
            many=True,
        ).data

        records = [
            get_schedule_report_record(schedule, serialized)
            for schedule, serialized in zip(
                schedules,
                serialized_records,
            )
        ]

        patient_details = None
        medical_profile = None

        if request.query_params.get("scope", "all") == "patient":
            patient = schedules.first().patient if schedules.exists() else None

            if patient:
                patient_details = get_patient_details(patient)
                medical_profile = get_medical_profile_details(patient)

        return Response({
            "title": get_report_title(request),
            "summary": summary,
            "patient_details": patient_details,
            "medical_profile": medical_profile,
            "records": records,
        })


# =========================================================
# PDF EXPORT API
# =========================================================

class DailyReportPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        schedules = get_filtered_schedules(request)
        summary = get_report_summary(schedules)

        buffer = build_pdf_report(request, schedules, summary)

        return FileResponse(
            buffer,
            as_attachment=True,
            filename="dialysis_comprehensive_report.pdf",
            content_type="application/pdf",
        )


# =========================================================
# EXCEL EXPORT API
# =========================================================

class DailyReportExcelView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        schedules = get_filtered_schedules(request)
        summary = get_report_summary(schedules)

        workbook = build_excel_report(
            request,
            schedules,
            summary,
        )

        response = HttpResponse(
            content_type=(
                "application/vnd.openxmlformats-officedocument."
                "spreadsheetml.sheet"
            )
        )

        response["Content-Disposition"] = (
            'attachment; filename="dialysis_comprehensive_report.xlsx"'
        )

        workbook.save(response)
        return response
