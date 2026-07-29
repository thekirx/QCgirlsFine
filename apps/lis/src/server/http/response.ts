import { NextResponse } from "next/server";
export function apiError(error: unknown) { const message=error instanceof Error?error.message:"Unexpected error"; const status=message==="UNAUTHORIZED"?403:message.includes("not validated")||message.includes("not ready")||message.includes("required")?409:400; return NextResponse.json({error:message},{status}); }
