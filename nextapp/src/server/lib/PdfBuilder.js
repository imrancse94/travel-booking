import PDFDocument from 'pdfkit';

// Thin wrapper around `pdfkit`. Application code depends on this class, never
// on `pdfkit` directly, so the PDF rendering library can be swapped later.
// Exposes just enough building blocks (text, table-ish rows, headings) to
// render a clean invoice document.
export class PdfBuilder {
  constructor(options = {}) {
    this.doc = new PDFDocument({ size: 'A4', margin: 50, ...options });
  }

  pipe(stream) {
    this.doc.pipe(stream);
    return this;
  }

  font(name) {
    this.doc.font(name);
    return this;
  }

  fontSize(size) {
    this.doc.fontSize(size);
    return this;
  }

  fillColor(color) {
    this.doc.fillColor(color);
    return this;
  }

  text(str, options) {
    this.doc.text(str, options);
    return this;
  }

  heading(str, { size = 18 } = {}) {
    this.doc.font('Helvetica-Bold').fontSize(size).fillColor('#111827').text(str);
    return this;
  }

  moveDown(lines = 1) {
    this.doc.moveDown(lines);
    return this;
  }

  moveTo(x, y) {
    this.doc.moveTo(x, y);
    return this;
  }

  lineTo(x, y) {
    this.doc.lineTo(x, y);
    return this;
  }

  stroke(color) {
    this.doc.stroke(color);
    return this;
  }

  hr() {
    const y = this.doc.y;
    this.doc
      .strokeColor('#e5e7eb')
      .moveTo(this.doc.page.margins.left, y)
      .lineTo(this.doc.page.width - this.doc.page.margins.right, y)
      .stroke();
    this.doc.moveDown(0.5);
    return this;
  }

  /**
   * Renders one table-ish row of columns at fixed x positions.
   * columns: [{ text, width, align }]
   */
  row(columns, { bold = false, size = 10, color = '#111827' } = {}) {
    const startX = this.doc.page.margins.left;
    const y = this.doc.y;
    this.doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(color);

    let x = startX;
    for (const col of columns) {
      this.doc.text(col.text ?? '', x, y, { width: col.width, align: col.align || 'left' });
      x += col.width;
    }
    this.doc.moveDown(0.3);
    return this;
  }

  end() {
    this.doc.end();
    return this;
  }

  /**
   * Ends the document and resolves with the fully rendered PDF as a Buffer.
   * Do not call `.pipe()`/`.end()` separately if you use this method.
   */
  toBuffer() {
    return new Promise((resolve, reject) => {
      const chunks = [];
      this.doc.on('data', (chunk) => chunks.push(chunk));
      this.doc.on('end', () => resolve(Buffer.concat(chunks)));
      this.doc.on('error', reject);
      this.doc.end();
    });
  }
}
