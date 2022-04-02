import { PDFDocument } from "pdf-lib";  //https://pdf-lib.js.org/
import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs';

async function createForm() {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([550, 750])
    const form = pdfDoc.getForm()
    
    page.drawText('Name ( Last, First, I.)', { x: 50, y: 700, size: 10})
    const nameTextField = form.createTextField('name')
    nameTextField.addToPage(page, { x:50, y:680, width:200, height:12 })
    
    const uint8Array = fs.readFileSync('./pdf_filler_content/image.jpg')
    const jpgImage = await pdfDoc.embedJpg(uint8Array)
    // const jpgImage = './pdf_filler_content/image.jpg'

    page.drawImage(jpgImage, {
        x: 50,
        y: 575,
        width: 200,
        height: 100,
      })

    const pdfBytes = await pdfDoc.save()
    fs.writeFileSync(`./output/${uuidv4()}.pdf`, pdfBytes)
    return pdfBytes
}

createForm()
