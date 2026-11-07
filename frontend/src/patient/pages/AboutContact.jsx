
import { useCallback, useEffect, useState } from "react";
import PatientLayout from "../layouts/PatientLayout";
import PatientLoading from "../components/PatientLoading";

import {
    FaHospital,
    FaMapMarkerAlt,
    FaPhoneAlt,
    FaEnvelope,
    FaClock,
    FaCalendarCheck,
    FaUserShield,
    FaQuestionCircle,
    FaChevronDown,
    FaInfoCircle,
    FaExclamationTriangle,
    FaHeartbeat,
    FaArrowRight,
    FaShieldAlt,
} from "react-icons/fa";

const clinic = {
    name: "YOUR DIALYSIS CLINIC NAME",
    address: "Enter the complete clinic address",
    phone: "09XX XXX XXXX",
    email: "yourclinic@example.com",
    hours: "Enter clinic operating hours",
};

const faqs = [
    {
        question: "How can I check my dialysis schedule?",
        answer:
            "Open the Schedule page in your patient portal to review your upcoming dialysis sessions and appointment details.",
    },
    {
        question: "What should I do if my schedule is incorrect?",
        answer:
            "Contact the clinic to verify your appointment. Wait for confirmation from the clinic before assuming that your schedule has changed.",
    },
    {
        question: "What if I cannot log in?",
        answer:
            "Double-check your patient credentials and try again. If the problem continues, contact the clinic for assistance with your account.",
    },
    {
        question: "What should I do if I need to miss a session?",
        answer:
            "Contact your clinic as soon as possible. Do not skip or reschedule dialysis without guidance from your healthcare team.",
    },
    {
        question: "Can I use this website for medical emergencies?",
        answer:
            "No. This portal is for patient information and scheduling, not emergency care. Seek immediate medical attention for urgent symptoms.",
    },
];

function SectionTitle({ eyebrow, children }) {
    return (
        <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                {eyebrow}
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-800 sm:text-2xl">
                {children}
            </h2>
        </div>
    );
}

function InfoCard({ icon: Icon, title, children }) {
    return (
        <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Icon size={18} />
            </div>

            <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-800">
                    {title}
                </h3>

                <div className="mt-2 break-words text-sm leading-6 text-slate-500">
                    {children}
                </div>
            </div>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, description }) {
    return (
        <article className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl text-teal-700 transition group-hover:bg-teal-100">
                <Icon />
            </div>

            <h3 className="font-bold text-slate-800">
                {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
            </p>
        </article>
    );
}

export default function AboutContact() {
    const [openFaq, setOpenFaq] = useState(0);
    const [loading, setLoading] = useState(true);
    const [fadeOut, setFadeOut] = useState(false);

    const handleFadeOutComplete = useCallback(() => {
        setLoading(false);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setFadeOut(true);
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <PatientLayout>
            <div className="min-h-screen bg-slate-50/70 -m-4 p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
                <div className="mx-auto max-w-7xl space-y-7">

                    {/* Page header - consistent with dashboard */}
                    <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-700">
                                <FaHeartbeat />
                                <span>PATIENT PORTAL</span>
                            </div>

                            <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                                About &amp; Contact
                            </h1>

                            <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                                Learn about our clinic, explore patient resources,
                                and find the support you need.
                            </p>
                        </div>

                        <div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl text-teal-700 sm:flex">
                            <FaHospital />
                        </div>
                    </header>

                    {/* Main hero - same gradient as Today's Dialysis */}
                    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#28383f] via-[#30474d] to-[#176c70] p-6 text-white shadow-xl shadow-slate-300/30 sm:p-8">
                        <div
                            className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/10"
                            aria-hidden="true"
                        />
                        <div
                            className="pointer-events-none absolute -right-6 -top-10 h-44 w-44 rounded-full border border-white/10"
                            aria-hidden="true"
                        />
                        <div
                            className="pointer-events-none absolute bottom-0 right-24 h-28 w-28 rounded-full bg-teal-300/10 blur-2xl"
                            aria-hidden="true"
                        />

                        <div className="relative">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                                <div className="max-w-3xl">
                                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-teal-100">
                                        <span className="h-2 w-2 rounded-full bg-teal-300" />
                                        ABOUT OUR CLINIC
                                    </div>

                                    <h2 className="text-xl font-semibold text-white sm:text-2xl">
                                        Committed to Your Care
                                    </h2>

                                    <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                                        {clinic.name} supports patients receiving
                                        dialysis care through organized scheduling,
                                        accessible patient information, and
                                        communication with the healthcare team.
                                    </p>
                                </div>

                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl text-teal-200 shadow-inner">
                                    <FaHospital />
                                </div>
                            </div>

                            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200">
                                            <FaShieldAlt />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-xs text-slate-300">
                                                Our commitment
                                            </p>
                                            <p className="mt-1 font-semibold text-white">
                                                Patient-focused information
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200">
                                            <FaHeartbeat />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-xs text-slate-300">
                                                Your well-being
                                            </p>
                                            <p className="mt-1 font-semibold text-white">
                                                Your care matters
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* About and clinic information */}
                    <section>
                        <SectionTitle eyebrow="Who we are">
                            About Our Clinic
                        </SectionTitle>

                        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-xl text-teal-700">
                                    <FaHospital />
                                </div>

                                <div className="min-w-0">
                                    <h3 className="text-lg font-bold text-slate-800">
                                        {clinic.name}
                                    </h3>

                                    <p className="mt-2 text-sm leading-7 text-slate-500">
                                        We aim to help patients stay informed
                                        about their dialysis appointments and
                                        available patient information. Our
                                        portal provides a convenient place to
                                        review relevant details and find clinic
                                        contact information when assistance is
                                        needed.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <InfoCard
                                icon={FaMapMarkerAlt}
                                title="Clinic Address"
                            >
                                {clinic.address}
                            </InfoCard>

                            <InfoCard
                                icon={FaClock}
                                title="Operating Hours"
                            >
                                {clinic.hours}
                            </InfoCard>
                        </div>
                    </section>

                    {/* Patient portal features */}
                    <section>
                        <SectionTitle eyebrow="Patient resources">
                            Your Patient Portal
                        </SectionTitle>

                        <p className="mb-5 max-w-3xl text-sm leading-6 text-slate-500">
                            Access your available patient information and stay
                            informed about your dialysis appointments using
                            the features provided in the portal.
                        </p>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <FeatureCard
                                icon={FaCalendarCheck}
                                title="Dialysis Schedule"
                                description="Review upcoming sessions and appointment details."
                            />

                            <FeatureCard
                                icon={FaUserShield}
                                title="Patient Profile"
                                description="Review your available personal and patient information."
                            />

                            <FeatureCard
                                icon={FaHeartbeat}
                                title="Stay Informed"
                                description="Access patient information made available through the portal."
                            />

                            <FeatureCard
                                icon={FaQuestionCircle}
                                title="Patient Support"
                                description="Find clinic contact details and answers to common questions."
                            />
                        </div>

                        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                                <FaInfoCircle />
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-slate-800">
                                    Please keep in mind
                                </h3>

                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    The patient portal helps you access
                                    information and manage appointments. It
                                    does not replace professional medical
                                    advice or direct communication with your
                                    healthcare team.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Contact the clinic */}
                    <section>
                        <SectionTitle eyebrow="We're here to help">
                            Contact the Clinic
                        </SectionTitle>

                        <p className="mb-5 max-w-3xl text-sm leading-6 text-slate-500">
                            Need help with your account or appointment?
                            Contact the clinic to verify your schedule or
                            request assistance.
                        </p>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <a
                                href={`tel:${clinic.phone.replace(/[^\d+]/g, "")}`}
                                aria-label={`Call clinic at ${clinic.phone}`}
                                className="group flex min-w-0 items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6"
                            >
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl text-emerald-700 transition group-hover:bg-emerald-100">
                                    <FaPhoneAlt />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-slate-400">
                                        Phone number
                                    </p>

                                    <p className="mt-1 break-words font-bold text-slate-800">
                                        {clinic.phone}
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-teal-700">
                                        Call the clinic
                                    </p>
                                </div>

                                <FaArrowRight className="shrink-0 text-sm text-slate-400 transition group-hover:translate-x-1 group-hover:text-teal-700" />
                            </a>

                            <a
                                href={`mailto:${clinic.email}`}
                                aria-label={`Email clinic at ${clinic.email}`}
                                className="group flex min-w-0 items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6"
                            >
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-xl text-teal-700 transition group-hover:bg-teal-100">
                                    <FaEnvelope />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-slate-400">
                                        Email address
                                    </p>

                                    <p className="mt-1 break-words font-bold text-slate-800">
                                        {clinic.email}
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-teal-700">
                                        Send an email
                                    </p>
                                </div>

                                <FaArrowRight className="shrink-0 text-sm text-slate-400 transition group-hover:translate-x-1 group-hover:text-teal-700" />
                            </a>
                        </div>

                        <p className="mt-4 text-xs leading-6 text-slate-400">
                            For your privacy, avoid sending passwords or
                            unnecessary sensitive medical information through
                            unsecured messages.
                        </p>
                    </section>

                    {/* Frequently asked questions */}
                    <section>
                        <SectionTitle eyebrow="Quick answers">
                            Frequently Asked Questions
                        </SectionTitle>

                        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                            {faqs.map((faq, index) => {
                                const isOpen = openFaq === index;

                                return (
                                    <div
                                        key={faq.question}
                                        className={
                                            index !== 0
                                                ? "border-t border-slate-100"
                                                : ""
                                        }
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setOpenFaq(
                                                    isOpen ? -1 : index
                                                )
                                            }
                                            aria-expanded={isOpen}
                                            className={`flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors sm:px-5 ${
                                                isOpen
                                                    ? "bg-teal-50/70"
                                                    : "bg-white hover:bg-slate-50"
                                            }`}
                                        >
                                            <span className="flex min-w-0 items-start gap-3">
                                                <span
                                                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                                        isOpen
                                                            ? "bg-teal-700 text-white"
                                                            : "bg-slate-100 text-slate-500"
                                                    }`}
                                                >
                                                    {index + 1}
                                                </span>

                                                <span className="pt-0.5 text-sm font-semibold leading-6 text-slate-800">
                                                    {faq.question}
                                                </span>
                                            </span>

                                            <FaChevronDown
                                                className={`mt-1 shrink-0 text-xs transition-transform duration-200 ${
                                                    isOpen
                                                        ? "rotate-180 text-teal-700"
                                                        : "text-slate-400"
                                                }`}
                                            />
                                        </button>

                                        <div
                                            className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
                                                isOpen
                                                    ? "grid-rows-[1fr]"
                                                    : "grid-rows-[0fr]"
                                            }`}
                                        >
                                            <div className="overflow-hidden">
                                                <p className="pb-4 pl-14 pr-5 text-sm leading-7 text-slate-500 sm:pb-5 sm:pl-16">
                                                    {faq.answer}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Medical notice */}
                    <section className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/80">
                        <div className="flex items-start gap-3 border-l-4 border-amber-400 p-4 sm:p-5">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                                <FaExclamationTriangle />
                            </div>

                            <div className="min-w-0">
                                <h3 className="font-bold text-amber-950">
                                    Important Medical Notice
                                </h3>

                                <p className="mt-2 text-sm leading-7 text-amber-900/80">
                                    This website is not an emergency service
                                    and does not replace advice from your
                                    healthcare team. For severe or urgent
                                    symptoms, seek immediate medical
                                    attention. Do not delay emergency care
                                    while trying to contact the clinic
                                    through this portal.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Footer - matches dashboard footer */}
                    <footer className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                        <p className="flex items-center gap-2">
                            <FaHeartbeat className="text-teal-600" />
                            Your care, organized in one place.
                        </p>

                        <p>AI Dialysis System · Patient Portal</p>
                    </footer>
                </div>
            </div>

            {/* Loading overlay - same callback pattern as Home.jsx */}
            {loading && (
                <PatientLoading
                    message="Loading about us..."
                    fadeOut={fadeOut}
                    onFadeOutComplete={handleFadeOutComplete}
                />
            )}
        </PatientLayout>
    );
}
