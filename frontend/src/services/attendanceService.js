export async function getAttendanceImportScreenData() {
  return {
    steps: [
      { key: 'upload', label: 'Upload file', status: 'done' },
      { key: 'parse', label: 'Parse & validate', status: 'done' },
      { key: 'review', label: 'Review & xác nhận', status: 'active' },
      { key: 'save', label: 'Lưu vào DB', status: 'pending' },
    ],
    stats: [],
    records: [],
  };
}

