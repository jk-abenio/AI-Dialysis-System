export default function TreatmentDetailsModal({
    open,
    treatment,
    onClose,
}) {

    if (!open || !treatment) return null;

    return (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

            <div className="bg-white rounded-xl w-full max-w-3xl p-8">

                <div className="flex justify-between items-center mb-6">

                    <h2 className="text-2xl font-bold">

                        Treatment Details

                    </h2>

                    <button
                        onClick={onClose}
                        className="text-gray-500"
                    >
                        ✕
                    </button>

                </div>

                <div className="grid grid-cols-2 gap-6">

                    <div>
                        <p className="text-gray-500">Treatment Date</p>
                        <p className="font-semibold">
                            {treatment.dialysis_date}
                        </p>
                    </div>

                    <div>
                        <p className="text-gray-500">Machine</p>
                        <p className="font-semibold">
                            {treatment.machine_name}
                        </p>
                    </div>

                    <div>
                        <p className="text-gray-500">Staff</p>
                        <p className="font-semibold">
                            {treatment.staff_name}
                        </p>
                    </div>

                    <div>
                        <p className="text-gray-500">Pre Weight</p>
                        <p className="font-semibold">
                            {treatment.pre_weight} kg
                        </p>
                    </div>

                    <div>
                        <p className="text-gray-500">Post Weight</p>
                        <p className="font-semibold">
                            {treatment.post_weight} kg
                        </p>
                    </div>

                    <div>
                        <p className="text-gray-500">Blood Pressure Before</p>
                        <p className="font-semibold">
                            {treatment.blood_pressure_before}
                        </p>
                    </div>

                    <div>
                        <p className="text-gray-500">Blood Pressure After</p>
                        <p className="font-semibold">
                            {treatment.blood_pressure_after}
                        </p>
                    </div>

                    <div>
                        <p className="text-gray-500">Pulse Before</p>
                        <p className="font-semibold">
                            {treatment.pulse_before}
                        </p>
                    </div>

                    <div>
                        <p className="text-gray-500">Pulse After</p>
                        <p className="font-semibold">
                            {treatment.pulse_after}
                        </p>
                    </div>

                    <div className="col-span-2">
                        <p className="text-gray-500">Notes</p>

                        <div className="border rounded-lg p-4 bg-gray-50">
                            {treatment.notes || "-"}
                        </div>
                    </div>

                </div>

                <div className="flex justify-end mt-8">

                    <button
                        onClick={onClose}
                        className="bg-blue-600 text-white px-5 py-2 rounded-lg"
                    >
                        Close
                    </button>

                </div>

            </div>

        </div>

    );

}