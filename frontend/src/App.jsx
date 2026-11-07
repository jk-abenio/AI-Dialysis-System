
import { BrowserRouter, Routes, Route } from "react-router-dom";

// admin imports
import ProtectedRoute from "./admin/routes/ProtectedRoute";
import Login from "./admin/pages/Login";
import Dashboard from "./admin/pages/Dashboard";
import Patients from "./admin/pages/Patients";
import Schedules from "./admin/pages/Schedules";
import Machines from "./admin/pages/Machines";
import Staff from "./admin/pages/Staff";
import PatientDetails from "./admin/pages/PatientDetails";
import Reports from "./admin/pages/Reports";
import EmailCenter from "./admin/pages/EmailCenter";
import { AuthProvider } from "./admin/context/AuthContext";
import AIRecommendations from "./admin/pages/AIRecommendations";
import SMSCenter from "./admin/pages/SMSCenter";
import Settings from "./admin/pages/Settings";

// patient imports
import PatientHome from "./patient/pages/Home";
import Schedule from "./patient/pages/Schedule";
import History from "./patient/pages/History";
import Profile from "./patient/pages/Profile";
import PatientLogin from "./patient/pages/Login";
import { PatientAuthProvider } from "./patient/context/PatientAuthContext";
import PatientProtectedRoute from "./patient/routes/PatientProtectedRoute";
import AboutContact from "./patient/pages/AboutContact";
import ScrollToTop from "./patient/components/ScrollToTop";
import PatientPasswordReset from "./patient/pages/PatientPasswordReset";

// staff imports
import StaffLogin from "./staff-portal/pages/StaffLogin";
import StaffPasswordSetup from "./staff-portal/pages/StaffPasswordSetup";
import { StaffAuthProvider } from "./staff-portal/context/StaffAuthContext";
import StaffProtectedRoute from "./staff-portal/routes/StaffProtectedRoute";
import StaffDashboard from "./staff-portal/pages/StaffDashboard";
import StaffSchedules from "./staff-portal/pages/StaffSchedules";
import StaffPasswordReset from "./staff-portal/pages/StaffPasswordReset";

function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />

            <AuthProvider>
                <PatientAuthProvider>
                    <StaffAuthProvider>
                        <Routes>
                            {/* PUBLIC ADMIN LOGIN */}
                            <Route path="/" element={<Login />} />

                            {/* PROTECTED ADMIN ROUTES */}
                            <Route element={<ProtectedRoute />}>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/patients" element={<Patients />} />
                                <Route path="/schedules" element={<Schedules />} />
                                <Route path="/machines" element={<Machines />} />
                                <Route path="/staff" element={<Staff />} />
                                <Route path="/patients/:id" element={<PatientDetails />} />
                                <Route path="/reports" element={<Reports />} />
                                <Route path="/notifications" element={<EmailCenter />} />
                                <Route
                                    path="/ai-recommendations"
                                    element={<AIRecommendations />}
                                />
                                <Route path="/sms-center" element={<SMSCenter />} />
                                <Route path="/settings" element={<Settings />} />
                            </Route>

                            {/* PUBLIC PATIENT ROUTES */}
                            <Route path="/patient/login" element={<PatientLogin />} />

                            {/* PATIENT PASSWORD RESET */}
                            <Route
                                path="/patient/reset-password"
                                element={<PatientPasswordReset />}
                            />

                            {/* PROTECTED PATIENT ROUTES */}
                            <Route element={<PatientProtectedRoute />}>
                                <Route path="/patient" element={<PatientHome />} />
                                <Route path="/patient/schedule" element={<Schedule />} />
                                <Route path="/patient/history" element={<History />} />
                                <Route path="/patient/profile" element={<Profile />} />
                                <Route path="/patient/about" element={<AboutContact />} />
                            </Route>

                            {/* PUBLIC STAFF ROUTES */}
                            <Route
                                path="/staff/login"
                                element={<StaffLogin />}
                            />
                            <Route
                                path="/staff/setup-password"
                                element={<StaffPasswordSetup />}
                            />
                            <Route
                                path="/staff/reset-password"
                                element={<StaffPasswordReset />}
                            />
                            {/* PROTECTED STAFF ROUTES */}
                            <Route element={<StaffProtectedRoute />}>
                                <Route path="/staff/dashboard" element={<StaffDashboard />}/>
                                <Route path="/staff/schedules" element={<StaffSchedules />}/>
                            </Route>
                        </Routes>
                    </StaffAuthProvider>
                </PatientAuthProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
