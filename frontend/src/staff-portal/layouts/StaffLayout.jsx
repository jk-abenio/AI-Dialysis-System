
import MobileHeader from "../components/MobileHeader";
import StaffBottomNav from "../components/StaffBottomNav";

export default function StaffLayout({ children }) {
    return (
        <div className="min-h-screen bg-slate-50/70">
            <MobileHeader />

            <main className="min-h-screen px-4 pb-32 pt-20 sm:px-6 lg:px-8">
                {children}
            </main>

            <StaffBottomNav />
        </div>
    );
}
