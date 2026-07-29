import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type ReportData = { accessionNumber:string; releasedAt:Date; patient:{medicalRecordNumber:string;firstName:string;middleName:string|null;lastName:string;birthDate:Date;sex:string}; requestingPhysician:string; source:string; tests:Array<{testDefinition:{code:string;name:string;unit:string|null};result:{numericValue:unknown;textValue:string|null;qualitativeCode:string|null;rangeText:string|null;abnormalFlag:string|null}|null}> };
export async function renderFinalReport(data: ReportData) {
  const pdf = await PDFDocument.create(); const page = pdf.addPage([595.28,841.89]); const regular = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold); const ink=rgb(.08,.16,.15), teal=rgb(.07,.42,.38), gray=rgb(.4,.47,.45);
  const text=(value:string,x:number,y:number,size=10,font=regular,color=ink)=>page.drawText(value,{x,y,size,font,color});
  text("QUESTCARE",48,785,19,bold,teal); text("LABORATORY RESULT REPORT",48,765,9,bold,gray); text("FINAL",495,780,10,bold,teal); page.drawLine({start:{x:48,y:750},end:{x:547,y:750},thickness:1,color:teal});
  const fullName=[data.patient.lastName,", ",data.patient.firstName,data.patient.middleName?` ${data.patient.middleName}`:""].join("");
  text("Patient",48,720,8,bold,gray); text(fullName,48,703,12,bold); text("Patient ID",330,720,8,bold,gray); text(data.patient.medicalRecordNumber,330,703,11,bold);
  text("Date of birth / Sex",48,680,8,bold,gray); text(`${data.patient.birthDate.toISOString().slice(0,10)} / ${data.patient.sex}`,48,663,10); text("Accession",330,680,8,bold,gray); text(data.accessionNumber,330,663,11,bold,teal);
  text("Requesting physician",48,640,8,bold,gray); text(data.requestingPhysician,48,623,10); text("Source",330,640,8,bold,gray); text(data.source,330,623,10);
  page.drawRectangle({x:48,y:575,width:499,height:27,color:rgb(.9,.95,.94)}); text("TEST",58,585,8,bold,teal); text("RESULT",280,585,8,bold,teal); text("UNIT",380,585,8,bold,teal); text("REFERENCE",455,585,8,bold,teal);
  let y=550; for(const row of data.tests){ const value=row.result?.numericValue?.toString() ?? row.result?.textValue ?? row.result?.qualitativeCode ?? ""; text(`${row.testDefinition.code}  ${row.testDefinition.name}`,58,y,9); text(value,280,y,9,row.result?.abnormalFlag?bold:regular,row.result?.abnormalFlag?rgb(.75,.25,.12):ink); text(row.testDefinition.unit??"-",380,y,9); text(row.result?.rangeText??"-",455,y,9); page.drawLine({start:{x:48,y:y-12},end:{x:547,y:y-12},thickness:.5,color:rgb(.85,.88,.87)}); y-=34; }
  text("This report is an immutable snapshot of the released laboratory result.",48,112,8,regular,gray); text(`Released: ${data.releasedAt.toISOString()}`,48,94,8,regular,gray); text(`Report ID: RPT-${data.accessionNumber}`,48,76,8,bold,ink); text("Page 1 of 1",490,76,8,regular,gray);
  return pdf.save({ useObjectStreams:false });
}
