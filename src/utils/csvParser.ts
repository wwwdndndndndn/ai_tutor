export async function parseCSV(file: File): Promise<any[]> {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        const result = lines.map((line) => {
          const columns = line.split(",");
          return {
            name: columns[0]?.trim(),
            email: columns[1]?.trim(),
            classId: columns[2]?.trim(),
          };
        });
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (e) => {
      reject(new Error("Failed to read the file"));
    };
    reader.readAsText(file);
  });
}
