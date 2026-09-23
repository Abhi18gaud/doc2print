const os = require('os');
const path = require('path');

let ptp;
try {
  ptp = require('pdf-to-printer');
} catch (e) {
  console.warn('pdf-to-printer module not loaded, falling back to simulated printer driver:', e.message);
}

class PrintDriver {
  constructor(config = {}) {
    this.config = config;
    this.isWindows = os.platform() === 'win32';
  }

  async listAvailablePrinters() {
    if (this.isWindows && ptp) {
      try {
        const printers = await ptp.getPrinters();
        return printers.map((p) => p.name);
      } catch (err) {
        console.warn('Could not query OS printers:', err.message);
      }
    }
    return ['Virtual Counter Spooler (Default)'];
  }

  async printFile(filePath, jobOptions = {}) {
    const printerName = this.config.printerName;
    const copies = jobOptions.copies || 1;
    const paperSize = jobOptions.paper_size || 'A4';
    const duplex = jobOptions.duplex;

    console.log(`[DRIVER] Spooling print job: ${path.basename(filePath)}`);
    console.log(`[DRIVER] Parameters: ${copies} copies | Paper: ${paperSize} | Duplex: ${duplex ? 'Yes' : 'No'}`);

    if (this.isWindows && ptp && !this.config.simulationMode) {
      try {
        const ptpOptions = {
          copies,
          paperSize: paperSize.toUpperCase(),
        };

        if (printerName) {
          ptpOptions.printer = printerName;
        }

        if (duplex) {
          ptpOptions.side = 'duplex';
        }

        await ptp.print(filePath, ptpOptions);
        console.log(`[DRIVER] Sent to Windows Print Spooler successfully.`);
        return { success: true };
      } catch (err) {
        console.warn(`[DRIVER] Physical printer print failed (${err.message}).`);
        if (this.config.simulateIfNoPrinter) {
          console.log(`[DRIVER] Fallback: Simulated silent print complete for testing.`);
          await new Promise((resolve) => setTimeout(resolve, 1200));
          return { success: true, simulated: true };
        }
        throw err;
      }
    } else {
      // Simulation / non-windows fallback
      console.log(`[DRIVER] [SIMULATION] Simulating mechanical print spool (1.2s delay)...`);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      console.log(`[DRIVER] [SIMULATION] Printed ${copies} sets successfully.`);
      return { success: true, simulated: true };
    }
  }
}

module.exports = PrintDriver;
