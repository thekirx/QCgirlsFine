export interface SpoolStore { put(messageId:string,envelope:unknown):Promise<void>; complete(messageId:string):Promise<void>; }
