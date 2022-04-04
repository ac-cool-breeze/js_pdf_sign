const { PDFDocument, decodePDFRawStream, utf16Decode, pdfDocEncodingDecode, utf16Encode, toHexStringOfMinLength } = require("pdf-lib");  //https://pdf-lib.js.org/
const { v4 } = require('uuid');
const fs = require('node:fs');
const forge = require('node-forge');
// import signer from 'node-signpdf';
const { plainAddPlaceholder } = require('node-signpdf');
const signer = require('node-signpdf').default;

// Video summary of what a digital signature is inside of a PDF: https://www.youtube.com/watch?v=6XsDVx0tjLc&t=1s
// Video of creating fake signing(self signed) certs: https://www.youtube.com/watch?v=1YjlcF1_0cU

// For programatically creating a PDF
async function createForm() {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([550, 750])
  const form = pdfDoc.getForm()

  page.drawText('Name ( Last, First, I.)', { x: 50, y: 700, size: 10 })
  const nameTextField = form.createTextField('name')
  nameTextField.addToPage(page, { x: 50, y: 680, width: 200, height: 12 })

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
  fs.writeFileSync(`./output/${v4()}.pdf`, pdfBytes)
  return pdfBytes
}

// For creating the little signature text
async function createTextSignature(user) {
  // LAST.FIRST.MIDDLE.IDNUMBER
  const { firstName, lastName, middle } = user
  const uint8Array = fs.readFileSync(`./output/${lastName}.${firstName}-filled.pdf`,)
  const pdfDoc = await PDFDocument.load(uint8Array)

  // THIS SECTION FOR MARKING OLD FORMS READONLY
  const form = pdfDoc.getForm()
  form.getField('xtype').enableReadOnly()
  form.getField('userid').enableReadOnly()
  form.getField('reqdate').enableReadOnly()
  form.getField('syst_name').enableReadOnly()
  form.getField('location').enableReadOnly()
  form.getField('name').enableReadOnly()
  form.getField('reqorg').enableReadOnly()
  form.getField('reqsymb').enableReadOnly()
  form.getField('reqphone').enableReadOnly()
  form.getField('reqemail').enableReadOnly()
  form.getField('reqtitle').enableReadOnly()
  form.getField('reqaddr').enableReadOnly()
  form.getField('xcitizen').enableReadOnly()
  form.getField('xdesignation').enableReadOnly()
  form.getField('xia').enableReadOnly()
  form.getField('trngdate').enableReadOnly()
  form.getField('user_name').enableReadOnly()
  form.getField('userdate').enableReadOnly()
  form.getField('usersign').enableReadOnly()


  pdfDoc.getPage(0).drawText(`Digitally signed by ${lastName}.${firstName}.${middle}`, { x: 235, y: 450, size: 8 })

  const pdfBytes = await pdfDoc.save({ useObjectStreams: false })
  fs.writeFileSync(`./output/${lastName}.${firstName}-prepared.pdf`, pdfBytes)
  return pdfBytes
}

// Fills out unlocked 2875
async function fill2875(blank2875, user) {
  const { firstName, lastName, middle } = user
  const pdfDoc = await PDFDocument.load(fs.readFileSync(blank2875))
  // decodePDFRawStream
  const form = pdfDoc.getForm()

  // TYPE OF REQUEST
  form.getField('xtype').select('init')

  // DATE(YYYYMMDD)
  let date_time = new Date()
  let date = ("0" + date_time.getDate()).slice(-2);
  let month = ("0" + (date_time.getMonth() + 1)).slice(-2);
  let year = date_time.getFullYear();
  form.getField('reqdate').setText(`${year}${month}${date}`)

  // System Name (Platform or Applications)
  form.getField('syst_name').setText('Detention Block AA Security System');

  // Location (Physical Location of System)
  form.getField('location').setText('DS-1 Orbital Battle Station');

  // 1. Requester Name
  form.getField('name').setText(`${lastName}, ${firstName}, ${middle}`);

  // 2. Organization Name
  form.getField('reqorg').setText('501st');

  // 3. OFFICE SYMBOL/DEPARTMENT
  form.getField('reqsymb').setText('NT-311');

  // 4. PHONE (DSN or Commercial)
  form.getField('reqphone').setText('8675309')

  // 5. OFFICIAL E-MAIL ADDRESS
  form.getField('reqemail').setText('nt311@devastator.mil');

  // 6. JOB TITLE AND GRADE/RANK
  form.getField('reqtitle').setText('Point Man/Storm Trooper');

  // 7. OFFICIAL MAILING ADDRESS
  form.getField('reqaddr').setText('Star Destroyer @ Tatooine, Imperial I-Class in Tatooine System');

  // 8. CITIZENSHIP
  form.getField('xcitizen').select('Oth');

  // 9. DESIGNATION OF PERSION
  form.getField('xdesignation').select('mil');

  // 10. IA CERT
  form.getField('xia').check();
  form.getField('trngdate').setText(`${year}${month}${date}`);


  // 11. User Signature name
  form.getField('user_name').setText(`${lastName}, ${firstName}, ${middle}`)

  // console.log(form.getField('usersign'))

  // 12. DATE ( signature )
  form.getField('userdate').setText(`${year}${month}${date}`)

  // 13. JUSTIFICATION FOR ACCESS
  form.getField('justify').setText('Performance of duties in security investigations related to missing schematics IAW Lord Vader.')

  const toOctalStringOfMinLength = (num, minLength) =>
    num.toString(8).padStart(minLength, '0');

  const utf16EncodeAsBytes = (input, byteOrderMark = true) => {
    const utf16 = utf16Encode(input, byteOrderMark);
    const bytes = new Uint8Array(utf16.length * 2);

    let offset = 0;
    for (let idx = 0, len = utf16.length; idx < len; idx++) {
      bytes[offset++] = (utf16[idx] & 0xff00) >> 8;
      bytes[offset++] = (utf16[idx] & 0x00ff) >> 0;
    }

    return bytes;
  };

  // for debugging fields in certain PDFs
  const printHexString = (input) => {
    const words = utf16Encode(input);
    const hex = Array.from(words).map((word) => toHexStringOfMinLength(word, 4));
    const hexString = '<' + hex.join('') + '>';
    console.log('hex', hexString);
  };

  // for debugging fields in certain PDFs
  const printLiteralString = (input) => {
    const bytes = utf16EncodeAsBytes(input);
    const octal = Array.from(bytes).map((byte) => toOctalStringOfMinLength(byte, 3));
    const literalString = '(' + octal.map((byte) => `\\${byte}`).join('') + ')';
    console.log('literal', literalString);
  };

  // To list form fields:
  // const fields = form.getFields()
  // fields.forEach(field => {
  //   const type = field.constructor.name
  //   const name = field.getName()
  //   // printHexString(name)
  //   // printLiteralString(name)
  //   console.log(`${type}: ${name}`)
  // })

  const pdfBytes = await pdfDoc.save({ useObjectStreams: false })
  fs.writeFileSync(`./output/${lastName}.${firstName}-filled.pdf`, pdfBytes)
  return pdfBytes
}

// Signs filled out pdf with fake certs
async function signPDF(user) {
  const { firstName, lastName } = user
  const pdfBuffer = fs.readFileSync(`./output/${lastName}.${firstName}-prepared.pdf`);
  const certBuffer = fs.readFileSync('./pdf_filler_content/keyStore.p12');


  let inputBuffer = plainAddPlaceholder({
    pdfBuffer,
    reason: 'Signed Certificate.',
    contactInfo: 'sign@example.com',
    name: 'Example',
    location: 'Jakarta',
    signatureLength: certBuffer.length
  })

  const signedPDF = signer.sign(
    inputBuffer,
    certBuffer
  )

  fs.writeFileSync(`./output/${lastName}.${firstName}-signed.pdf`, signedPDF)
  return signedPDF
}

const user = { lastName: 'Male', firstName: 'Human', middle: 'A' }

const main =async() =>{
  await createForm()
  await fill2875('./DD2875_unlocked.pdf', user)
  await createTextSignature(user)
  await signPDF(user)
}

main()