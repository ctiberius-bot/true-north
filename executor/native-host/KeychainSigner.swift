import Foundation
import Security
let args=CommandLine.arguments
guard args.count==4,args[1]=="sign",args[2]=="--key-tag" else{exit(2)}
let tag=Data(args[3].utf8),query:[String:Any]=[kSecClass as String:kSecClassKey,kSecAttrApplicationTag as String:tag,kSecAttrKeyType as String:kSecAttrKeyTypeECSECPrimeRandom,kSecReturnRef as String:true]
var item:CFTypeRef?
guard SecItemCopyMatching(query as CFDictionary,&item)==errSecSuccess,let key=item as! SecKey? else{exit(3)}
let data=FileHandle.standardInput.readDataToEndOfFile();var error:Unmanaged<CFError>?
guard let signature=SecKeyCreateSignature(key,.ecdsaSignatureMessageX962SHA256,data as CFData,&error) as Data? else{exit(4)}
print(signature.base64EncodedString().replacingOccurrences(of:"+",with:"-").replacingOccurrences(of:"/",with:"_").replacingOccurrences(of:"=",with:""))
