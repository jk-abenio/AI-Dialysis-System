import Sidebar from "../components/dashboard/Sidebar";
import Topbar from "../components/dashboard/Topbar";

export default function DashboardLayout({ children }) {

    return (

        <div className="min-h-screen bg-slate-100">

            {/* Sidebar */}
            <Sidebar />

            {/* Main Application Area */}
            <div className="min-h-screen">

                {/* Topbar */}
                <Topbar />

                {/* Global Page Background */}
                <main
                    className="
                        relative
                        ml-64
                        pt-20
                        min-h-screen
                        overflow-hidden
                        bg-gradient-to-br
                        from-slate-50
                        via-blue-50
                        to-slate-100
                    "
                >

                    {/* Background Decorations */}
                    <div
                        className="
                            absolute
                            inset-0
                            overflow-hidden
                            pointer-events-none
                        "
                    >

                        {/* Top-right decoration */}
                        <div
                            className="
                                absolute
                                -top-32
                                -right-32
                                w-96
                                h-96
                                rounded-full
                                bg-blue-200/30
                                blur-3xl
                            "
                        />

                        {/* Left-middle decoration */}
                        <div
                            className="
                                absolute
                                top-1/3
                                -left-32
                                w-80
                                h-80
                                rounded-full
                                bg-cyan-200/20
                                blur-3xl
                            "
                        />

                        {/* Bottom-right decoration */}
                        <div
                            className="
                                absolute
                                -bottom-40
                                right-1/4
                                w-[28rem]
                                h-[28rem]
                                rounded-full
                                bg-indigo-200/20
                                blur-3xl
                            "
                        />

                    </div>

                    {/* Page Content */}
                    <div
                        className="
                            relative
                            z-10
                            p-8
                        "
                    >
                        {children}
                    </div>

                </main>

            </div>

        </div>

    );

}