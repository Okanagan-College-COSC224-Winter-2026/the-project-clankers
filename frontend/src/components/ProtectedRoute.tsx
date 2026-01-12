import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://localhost:5000";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const navigate = useNavigate();
    const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

    useEffect(() => {
        ;(async () => {
            try {
                const response = await fetch(`${BASE_URL}/user`, {
                    method: "GET",
                    credentials: "include",
                });
                if (response.ok) {
                    setIsAuthed(true);
                } else {
                    setIsAuthed(false);
                    navigate("/");
                }
            } catch (error) {
                console.error("Error checking authentication:", error);
                setIsAuthed(false);
                navigate("/");
            }
        })();
    }, [navigate]);

    return isAuthed ? <>{children}</> : null;
}