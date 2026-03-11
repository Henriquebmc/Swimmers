export const parseTimeToMs = (timeString: string): number => {
  if (!timeString) {
    throw new Error("Time string is required");
  }

  const normalized = timeString.trim();
  const parts = normalized.split(":").map((part) => part.trim());

  if (parts.length > 1) {
    const numericParts = parts.map((part) => Number(part));
    if (numericParts.some((part) => Number.isNaN(part))) {
      throw new Error("Invalid time format");
    }

    if (numericParts.length === 2) {
      const [minutes, seconds] = numericParts;
      return Math.round((minutes * 60 + seconds) * 1000);
    }

    if (numericParts.length === 3) {
      const [hours, minutes, seconds] = numericParts;
      return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
    }

    throw new Error("Invalid time format");
  }

  const seconds = Number(normalized);
  if (Number.isNaN(seconds)) {
    throw new Error("Invalid time format");
  }
  return Math.round(seconds * 1000);
};
