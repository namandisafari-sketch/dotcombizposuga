/// <reference path="../types/webusb.d.ts" />
/**
 * Thermal Printer Utility using WebUSB for direct printing
 * Bypasses Android print dialog by sending ESC/POS commands directly
 */

import type { USBDevice, USBEndpoint } from "../types/webusb.d";

// ESC/POS Command Constants
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// Common thermal printer vendor IDs
const THERMAL_PRINTER_VENDORS = [
  0x0483, // STMicroelectronics (common for POS printers)
  0x0416, // Winbond
  0x0dd4, // Custom
  0x0fe6, // ICS
  0x1504, // POS-X
  0x2730, // Citizen
  0x0519, // Star Micronics
  0x04b8, // Epson/Seiko
  0x0525, // Netchip
  0x067b, // Prolific (USB-Serial)
  0x1a86, // QinHeng Electronics (CH340)
  0x10c4, // Silicon Labs
];

interface PrinterDevice {
  device: USBDevice;
  endpointOut: USBEndpoint | null;
}

let connectedPrinter: PrinterDevice | null = null;

/**
 * Check if WebUSB is supported
 */
export const isWebUSBSupported = (): boolean => {
  return typeof navigator !== "undefined" && "usb" in navigator;
};

/**
 * Request access to a USB thermal printer
 */
export const requestPrinter = async (): Promise<USBDevice | null> => {
  if (!isWebUSBSupported()) {
    throw new Error("WebUSB is not supported in this browser. Please use Chrome on Android.");
  }

  try {
    const device = await navigator.usb.requestDevice({
      filters: THERMAL_PRINTER_VENDORS.map((vendorId) => ({ vendorId })),
    });
    return device;
  } catch (error) {
    if ((error as Error).name === "NotFoundError") {
      // User cancelled the picker
      return null;
    }
    throw error;
  }
};

/**
 * Connect to a USB printer and prepare for printing
 */
export const connectPrinter = async (device: USBDevice): Promise<boolean> => {
  try {
    await device.open();

    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    // Find the bulk OUT endpoint for printing
    const interfaces = device.configuration?.interfaces || [];
    let endpointOut: USBEndpoint | null = null;

    for (const iface of interfaces) {
      for (const alternate of iface.alternates) {
        for (const endpoint of alternate.endpoints) {
          if (endpoint.direction === "out" && endpoint.type === "bulk") {
            await device.claimInterface(iface.interfaceNumber);
            endpointOut = endpoint;
            break;
          }
        }
        if (endpointOut) break;
      }
      if (endpointOut) break;
    }

    if (!endpointOut && interfaces.length > 0) {
      // Try claiming interface 0 as fallback
      await device.claimInterface(0);
      const iface = interfaces[0];
      if (iface?.alternates[0]?.endpoints) {
        endpointOut = iface.alternates[0].endpoints.find(
          (e) => e.direction === "out"
        ) || null;
      }
    }

    connectedPrinter = { device, endpointOut };
    return true;
  } catch (error) {
    console.error("Failed to connect to printer:", error);
    return false;
  }
};

/**
 * Disconnect from the current printer
 */
export const disconnectPrinter = async (): Promise<void> => {
  if (connectedPrinter?.device) {
    try {
      await connectedPrinter.device.close();
    } catch (error) {
      console.error("Error disconnecting printer:", error);
    }
    connectedPrinter = null;
  }
};

/**
 * Get previously paired devices
 */
export const getPairedDevices = async (): Promise<USBDevice[]> => {
  if (!isWebUSBSupported()) {
    return [];
  }
  return navigator.usb.getDevices();
};

/**
 * Send raw data to the printer
 */
const sendToPrinter = async (data: Uint8Array): Promise<boolean> => {
  if (!connectedPrinter?.device || !connectedPrinter.endpointOut) {
    throw new Error("No printer connected");
  }

  try {
    await connectedPrinter.device.transferOut(
      connectedPrinter.endpointOut.endpointNumber,
      new Uint8Array(data) as unknown as ArrayBuffer
    );
    return true;
  } catch (error) {
    console.error("Failed to send data to printer:", error);
    return false;
  }
};

/**
 * ESC/POS command builder
 */
class ESCPOSBuilder {
  private buffer: number[] = [];

  // Initialize printer
  init(): this {
    this.buffer.push(ESC, 0x40); // ESC @
    return this;
  }

  // Set text alignment
  align(alignment: "left" | "center" | "right"): this {
    const alignCode = alignment === "left" ? 0 : alignment === "center" ? 1 : 2;
    this.buffer.push(ESC, 0x61, alignCode); // ESC a n
    return this;
  }

  // Set text size
  textSize(width: number = 1, height: number = 1): this {
    const size = ((width - 1) << 4) | (height - 1);
    this.buffer.push(GS, 0x21, size); // GS ! n
    return this;
  }

  // Bold text
  bold(enabled: boolean): this {
    this.buffer.push(ESC, 0x45, enabled ? 1 : 0); // ESC E n
    return this;
  }

  // Underline text
  underline(enabled: boolean): this {
    this.buffer.push(ESC, 0x2d, enabled ? 1 : 0); // ESC - n
    return this;
  }

  // Add text
  text(str: string): this {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    this.buffer.push(...bytes);
    return this;
  }

  // New line
  newLine(lines: number = 1): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(LF);
    }
    return this;
  }

  // Feed paper
  feed(lines: number = 1): this {
    this.buffer.push(ESC, 0x64, lines); // ESC d n
    return this;
  }

  // Cut paper (partial cut)
  cut(full: boolean = false): this {
    this.buffer.push(GS, 0x56, full ? 0 : 1); // GS V m
    return this;
  }

  // Open cash drawer
  openDrawer(): this {
    this.buffer.push(ESC, 0x70, 0, 25, 250); // ESC p m t1 t2
    return this;
  }

  // Draw horizontal line
  horizontalLine(char: string = "-", width: number = 32): this {
    this.text(char.repeat(width));
    return this.newLine();
  }

  // Print two columns (left and right aligned)
  twoColumns(left: string, right: string, width: number = 32): this {
    const spaces = width - left.length - right.length;
    this.text(left + " ".repeat(Math.max(1, spaces)) + right);
    return this.newLine();
  }

  // Build and return the command buffer
  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Format and print a receipt using ESC/POS commands
 */
export const printReceiptThermal = async (data: {
  businessName: string;
  address?: string;
  phone?: string;
  receiptNumber: string;
  date: string;
  cashier?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount?: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  footer?: string;
}): Promise<boolean> => {
  const builder = new ESCPOSBuilder();
  const lineWidth = 32; // Standard 80mm thermal printer width

  builder
    .init()
    // Header
    .align("center")
    .textSize(2, 2)
    .bold(true)
    .text(data.businessName)
    .newLine()
    .textSize(1, 1)
    .bold(false)
    .text(data.address || "")
    .newLine()
    .text(data.phone || "")
    .newLine()
    .newLine()
    // Receipt info
    .align("left")
    .horizontalLine("=", lineWidth)
    .twoColumns("Receipt #:", data.receiptNumber, lineWidth)
    .twoColumns("Date:", data.date, lineWidth)
    .twoColumns("Cashier:", data.cashier || "Staff", lineWidth)
    .horizontalLine("=", lineWidth)
    .newLine()
    // Items header
    .bold(true)
    .text("Item                 Qty   Total")
    .newLine()
    .bold(false)
    .horizontalLine("-", lineWidth);

  // Items
  for (const item of data.items) {
    const name = item.name.length > 20 ? item.name.substring(0, 18) + ".." : item.name;
    const qty = item.quantity.toString().padStart(3);
    const total = item.subtotal.toLocaleString().padStart(8);
    builder.text(`${name.padEnd(20)} ${qty} ${total}`).newLine();
  }

  builder
    .horizontalLine("-", lineWidth)
    // Totals
    .twoColumns("Subtotal:", `${data.subtotal.toLocaleString()} UGX`, lineWidth);

  if (data.discount && data.discount > 0) {
    builder.twoColumns("Discount:", `-${data.discount.toLocaleString()} UGX`, lineWidth);
  }

  builder
    .horizontalLine("=", lineWidth)
    .bold(true)
    .textSize(1, 2)
    .twoColumns("TOTAL:", `${data.total.toLocaleString()} UGX`, lineWidth)
    .textSize(1, 1)
    .bold(false)
    .horizontalLine("=", lineWidth)
    .newLine()
    .align("center")
    .text(`Payment: ${data.paymentMethod.toUpperCase()}`)
    .newLine();

  if (data.customerName) {
    builder.text(`Customer: ${data.customerName}`).newLine();
  }

  builder
    .newLine()
    .text(data.footer || "Thank you for your business!")
    .newLine()
    .text("Visit again soon!")
    .newLine()
    .feed(3)
    .cut();

  const commands = builder.build();
  return sendToPrinter(commands);
};

/**
 * Print raw text (for testing)
 */
export const printText = async (text: string): Promise<boolean> => {
  const builder = new ESCPOSBuilder();
  builder.init().text(text).newLine().feed(3).cut();
  return sendToPrinter(builder.build());
};

/**
 * Open cash drawer
 */
export const openCashDrawer = async (): Promise<boolean> => {
  const builder = new ESCPOSBuilder();
  builder.openDrawer();
  return sendToPrinter(builder.build());
};

/**
 * Get current printer status
 */
export const getPrinterStatus = (): {
  connected: boolean;
  deviceName?: string;
} => {
  if (!connectedPrinter?.device) {
    return { connected: false };
  }
  return {
    connected: true,
    deviceName: connectedPrinter.device.productName || "Unknown Printer",
  };
};
