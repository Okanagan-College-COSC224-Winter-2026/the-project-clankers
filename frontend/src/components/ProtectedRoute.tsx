import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://localhost:5000";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const navigate = useNavigate();
    // Optimistically trust localStorage so tabs don't flash blank while the
    // background /user check is in-flight. Only a real 401 clears this.
    const [isAuthed, setIsAuthed] = useState<boolean>(() => !!localStorage.getItem("user"));

    useEffect(() => {
        ;(async () => {
            try {
                const response = await fetch(`${BASE_URL}/user`, {
                    method: "GET",
                    credentials: "include",
                });
                if (response.ok) {
                    setIsAuthed(true);
                } else if (response.status === 401) {
                    // Token is genuinely expired / invalid — log out
                    localStorage.removeItem("user");
                    setIsAuthed(false);
                    navigate("/");
                }
                // Any other error (500, network blip) keeps the current state
                // so a temporarily-unavailable server doesn't boot the user out
            } catch {
                // Network error: server may be temporarily down.
                // Only redirect if we had no local session to begin with.
                if (!localStorage.getItem("user")) {
                    setIsAuthed(false);
                    navigate("/");
                }
            }
        })();
    }, [navigate]);

    return isAuthed ? <>{children}</> : null;
}