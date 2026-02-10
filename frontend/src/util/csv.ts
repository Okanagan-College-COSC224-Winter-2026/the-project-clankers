import { importStudentsForCourse } from "./api";

interface RosterUploadResult {
  message: string;
  enrolled_count: number;
  created_count: number;
  existing_count?: number;
  new_students?: Array<{
    email: string;
    student_id: string;
    temp_password: string;
  }>;
  existing_students?: Array<{
    email: string;
    student_id: string;
    name: string;
  }>;
}

export const importCSV = (id: string | number, onSuccess?: (data: RosterUploadResult) => void, onError?: (error: unknown) => void) => {
  // Prompt the user to select a file
  const input = document.createElement("input");
  input.setAttribute("type", "file");
  input.setAttribute("accept", ".csv");

  // Handle the file selection event
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    const reader = new FileReader();

    reader.onload = async () => {
      const text = reader.result?.toString();

      if (!text) {
        const error = "Please select a file to upload";
        if (onError) {
          onError(error);
        } else {
          alert(error);
        }
        return;
      }

      try {
        console.log('CSV Upload - Course ID:', id);
        console.log('CSV Upload - Text length:', text?.length);
        console.log('CSV Upload - First 100 chars:', text?.substring(0, 100));
        const result = await importStudentsForCourse(Number(id), text);
        console.log('CSV Upload - Result:', result);
        if (onSuccess) {
          onSuccess(result);
        }
      } catch (error) {
        console.error('CSV Upload - Error:', error);
        if (onError) {
          onError(error);
        } else {
          alert("Error: " + error);
        }
      }
    };

    if (!file) {
      const error = "Please select a file to upload";
      if (onError) {
        onError(error);
      } else {
        alert(error);
      }
      return;
    }

    reader.readAsText(file);
  });

  input.click();
};