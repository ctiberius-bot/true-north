import Foundation
import Security

private func fail(_ code: Int32) -> Never { exit(code) }
private func base64url(_ data: Data) -> String { data.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "") }
private func lookup(_ tag: Data) -> SecKey? {
  let query: [String: Any] = [kSecClass as String:kSecClassKey,kSecAttrApplicationTag as String:tag,kSecAttrKeyType as String:kSecAttrKeyTypeECSECPrimeRandom,kSecAttrKeyClass as String:kSecAttrKeyClassPrivate,kSecReturnRef as String:true]
  var item: CFTypeRef?
  guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess else { return nil }
  return (item as! SecKey)
}
private func spki(_ privateKey: SecKey) -> Data? {
  guard let publicKey=SecKeyCopyPublicKey(privateKey),let raw=SecKeyCopyExternalRepresentation(publicKey,nil) as Data?,raw.count==65 else{return nil}
  return Data([0x30,0x59,0x30,0x13,0x06,0x07,0x2a,0x86,0x48,0xce,0x3d,0x02,0x01,0x06,0x08,0x2a,0x86,0x48,0xce,0x3d,0x03,0x01,0x07,0x03,0x42,0x00])+raw
}
private func p1363(_ der: Data) -> Data? {
  let bytes=[UInt8](der);guard bytes.count>=8,bytes[0]==0x30 else{return nil};var i=1
  func length(_ index: inout Int)->Int?{guard index<bytes.count else{return nil};let first=Int(bytes[index]);index+=1;if first<128{return first};let count=first&0x7f;guard count>0,count<=2,index+count<=bytes.count else{return nil};var value=0;for _ in 0..<count{value=(value<<8)|Int(bytes[index]);index+=1};return value}
  guard let total=length(&i),i+total==bytes.count else{return nil}
  func integer(_ index: inout Int)->[UInt8]?{guard index<bytes.count,bytes[index]==0x02 else{return nil};index+=1;guard let count=length(&index),count>0,index+count<=bytes.count else{return nil};var value=Array(bytes[index..<index+count]);index+=count;while value.count>32&&value.first==0{value.removeFirst()};guard value.count<=32 else{return nil};return Array(repeating:0,count:32-value.count)+value}
  guard let r=integer(&i),let s=integer(&i),i==bytes.count else{return nil};return Data(r+s)
}

let args=CommandLine.arguments
guard args.count==4,args[2]=="--key-tag",!args[3].isEmpty else{fail(2)}
let command=args[1],tag=Data(args[3].utf8)
switch command {
case "convert-der":
  let der=FileHandle.standardInput.readDataToEndOfFile();guard let raw=p1363(der) else{fail(4)};print(base64url(raw))
case "create":
  guard lookup(tag)==nil else{fail(5)}
  let attributes:[String:Any]=[kSecAttrKeyType as String:kSecAttrKeyTypeECSECPrimeRandom,kSecAttrKeySizeInBits as String:256,kSecPrivateKeyAttrs as String:[kSecAttrIsPermanent as String:true,kSecAttrIsExtractable as String:false,kSecAttrApplicationTag as String:tag,kSecAttrAccessible as String:kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]]
  var error:Unmanaged<CFError>?;guard let created=SecKeyCreateRandomKey(attributes as CFDictionary,&error),let publicSpki=spki(created) else{fail(6)};print(base64url(publicSpki))
case "public":
  guard let existing=lookup(tag),let publicSpki=spki(existing) else{fail(3)};print(base64url(publicSpki))
case "sign":
  guard let existing=lookup(tag) else{fail(3)};let data=FileHandle.standardInput.readDataToEndOfFile();var error:Unmanaged<CFError>?;guard let der=SecKeyCreateSignature(existing,.ecdsaSignatureMessageX962SHA256,data as CFData,&error) as Data?,let raw=p1363(der) else{fail(4)};print(base64url(raw))
case "revoke":
  let query:[String:Any]=[kSecClass as String:kSecClassKey,kSecAttrApplicationTag as String:tag,kSecAttrKeyType as String:kSecAttrKeyTypeECSECPrimeRandom];let status=SecItemDelete(query as CFDictionary);guard status==errSecSuccess else{fail(status==errSecItemNotFound ? 3:7)};print("revoked")
default:fail(2)
}
