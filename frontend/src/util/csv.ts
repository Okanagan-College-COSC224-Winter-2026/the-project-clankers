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

export const importCSV = (
  id: string | number, 
  onSuccess?: (data: RosterUploadResult) => void, 
  onError?: (error: unknown) => void,
  onCancel?: () => void
) => {
  // Prompt the user to select a file
  const input = document.createElement("input");
  input.setAttribute("type", "file");
  input.setAttribute("accept", ".csv");

  // Handle cancel/close without selection
  let fileSelected = false;

  // Handle the file selection event
  input.addEventListener("change", async () => {
    fileSelected = true;
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

      // Validate CSV format - check headers
      const lines = text.trim().split('\n');
      if (lines.length === 0) {
        const error = "CSV file is empty. Please provide a valid roster file.";
        if (onError) {
          onError(error);
        } else {
          alert(error);
        }
        return;
      }

      // Check first line for required headers (must be exactly id, name, email)
      const headerLine = lines[0].trim();
      const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['id', 'name', 'email'];
      
      // Check for missing headers
      const missingHeaders = requiredHeaders.filter(required => !headers.includes(required));
      
      // Check for extra headers
      const extraHeaders = headers.filter(h => !requiredHeaders.includes(h));
      
      if (missingHeaders.length > 0 || extraHeaders.length > 0 || headers.length !== 3) {
        let error = "Invalid CSV format.\n\n";
        
        if (missingHeaders.length > 0) {
          error += `Missing required headers: ${missingHeaders.join(', ')}\n`;
        }
        
        if (extraHeaders.length > 0) {
          error += `Extra headers not allowed: ${extraHeaders.join(', ')}\n`;
        }
        
        error += "\nThe first line must contain exactly these headers: id, name, email\n\n" +
                 "Example format:\n" +
                 "id,name,email\n" +
                 "123456,John Doe,john.doe@example.com";
        
        if (onError) {
          onError(error);
        } else {
          alert(error);
        }
        return;
      }

      // Check if CSV has at least one data row
      if (lines.length < 2) {
        const error = "CSV file must contain at least one student record after the header row.";
        if (onError) {
          onError(error);
        } else {
          alert(error);
        }
        return;
      }

      // Check for duplicate student IDs in the CSV
      const idColumnIndex = headers.indexOf('id');
      const studentIds: string[] = [];
      const duplicateIds: string[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const columns = line.split(',').map(col => col.trim());
        const studentId = columns[idColumnIndex];
        
        if (studentId && studentIds.includes(studentId)) {
          if (!duplicateIds.includes(studentId)) {
            duplicateIds.push(studentId);
          }
        } else if (studentId) {
          studentIds.push(studentId);
        }
      }

      if (duplicateIds.length > 0) {
        const error = `Duplicate student IDs found in CSV: ${duplicateIds.join(', ')}\n\n` +
                     "Each student ID must be unique. Please check your CSV file and remove duplicate entries.";
        if (onError) {
          onError(error);
        } else {
          alert(error);
        }
        return;
      }

      try {
        const result = await importStudentsForCourse(Number(id), text);
        if (onSuccess) {
          onSuccess(result);
        }
      } catch (error) {
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

  // Detect when file picker is closed without selecting a file
  window.addEventListener('focus', () => {
    setTimeout(() => {
      if (!fileSelected && onCancel) {
        onCancel();
      }
      // Clean up the input element
      input.remove();
    }, 300);
  }, { once: true });

  input.click();
};