import MobileHeader from "../components/MobileHeader";
import BottomNav from "../components/BottomNav";

export default function PatientLayout({ children }) {

    return (

        <div className="min-h-screen bg-gray-100">

            <MobileHeader />

            <main className="pt-20 pb-24 px-4">

                {children}

            </main>

            <BottomNav />

        </div>

    );

}