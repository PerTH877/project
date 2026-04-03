const fs = require('fs');
const path = require('path');

const filesToRepo = [
  'c:\\Users\\Partho\\OneDrive\\Desktop\\project\\test_conn.js',
  'c:\\Users\\Partho\\OneDrive\\Desktop\\project\\server\\tmp_check_db.js',
  'c:\\Users\\Partho\\OneDrive\\Desktop\\project\\server\\apply_inventory_safety.js',
  'c:\\Users\\Partho\\OneDrive\\Desktop\\project\\server\\apply_proc_only.js',
  'c:\\Users\\Partho\\OneDrive\\Desktop\\project\\server\\final_native_fix.js'
];

const dirsToDelete = [
  'c:\\Users\\Partho\\OneDrive\\Desktop\\project\\archive'
];

filesToRepo.forEach(f => {
  if (fs.existsSync(f)) {
    try {
      fs.unlinkSync(f);
      console.log(`Deleted file: ${f}`);
    } catch (e) {
      console.error(`Failed to delete ${f}: ${e.message}`);
    }
  } else {
    console.log(`File not found: ${f}`);
  }
});

dirsToDelete.forEach(d => {
  if (fs.existsSync(d)) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
      console.log(`Deleted dir: ${d}`);
    } catch (e) {
      console.error(`Failed to delete dir ${d}: ${e.message}`);
    }
  } else {
    console.log(`Dir not found: ${d}`);
  }
});
