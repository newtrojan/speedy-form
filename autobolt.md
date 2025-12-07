Authentication Header
The HTTP Authentication header is necessary to specify when making a request to the API. It will look
similar to the following:
AutoBoltAuth version="1", timestamp=1679615604,
digest="2sthGjpJaZyMrR2tKUdWTHHv5U6cnmadlDcZl/onPTQ=",
nonce="CtLmCSAJwSKlioby83XFggs0vQw", userid= "b9778c14-3c57-41c4-b767-121e4909e8aa"
This header is made up of an “AutoBoltAuth” prefix and several comma separated values:
 version=”1” – Always specify a version that’s equal to the string “1”
 timestamp – The number of seconds since unix epoch (Unix time). Your request will be rejected
if this is off by too much, so make sure you get an up to date value for this with each request.
 nonce – A randomly generated string of 10-30 alphanumeric characters. You MUST use a unique
value with each request.
 userid – Your user id found on the api page
 digest – A generated digest (outlined below)
Digest
The digest is created by:

1. Concatenating the nonce with the time with the shared secret
2. Getting a sha256 hash of the concatenation
3. Converting it to a base64 OR hex string.
   For example, here is how this could be done in C#:
   public string GenerateDigest(string nonce, long time, string sharedSecret)
   {
   var unhashedDigest = nonce + time.ToString() + sharedSecret;
   using var hasher = System.Security.Cryptography.SHA256.Create();
   var bytes = System.Encoding.UTF8.GetBytes(unhashedDigest);
   var hashedBytes = hasher.ComputeHash(bytes);
   return System.Convert.ToBase64String(hashedBytes);
   }
   Or in php:
   function generateDigest($nonce, $time, $api_key) { 
 $unhashedDigest = $nonce . $time . $api_key; 
 $hashedBytes = hash('sha256', $unhashedDigest, true); 
 return base64_encode($hashedBytes);
   }
   This digest that is provided will then be used to authenticate your request.
   Decode API
   Url: https://api.myautobolt.com/v2/decode
   Method: POST
   Request Headers:
    Authorization: <your authorization header string>
    Content-Type: application/json
    Accept: application/json
   Request body:
   {
   "country": "US",
   "vin": "<vin number goes here>",
   "kind": "Windshield"
   }
   Properties:
    country – Either “CA” for Canada, “US” for United States, or “User” to use the settings from your
   user’s account. This should be set based on the origin of the vehicle.
    vin – The 17 character vehicle identification number.
    kind – Either “Back” for back glass or “Windshield” for windshield.
   Notes:
    The response may include more properties in the future (but never less), so please ensure your
   code does not error on unknown properties.
    Fields like calibrationTypeId and sensorId provide back a Guid. This Guid can be used as a value
   to link against as the “name” field values may change over time.
   422 Response: Unprocessable entity. Could be a bad VIN for example.
   429 Response: Too many requests. Please wait a little bit and try again.
   204 Response: No result
   200 Response:
    Windshield parts will always be ”Single”, but back glass will be either “Single”, “LeftRight”, or
   “AssemblyCenter” depending on the type of vehicle.
    A single result in the “parts” property means we were able to decode to a single part. If multiple
   parts are there, that means it was inconclusive.
   Here is the response represented as TypeScript interfaces (with DecodeResponse being the object that’s
   returned):
   interface DecodeResponse
   {
   /** Year of the vehicle. \*/
   year: number;
   /** Make of the vehicle. _/
   make: string;
   /\*\* Model of the vehicle. _/
   model: string;
   /** Body style of the vehicle. \*/
   bodyStyle: string | undefined;
   /** Parts that matched for this vehicle.

-
- Index this value into "partsById" to get the part. _/
  parts: string[];
  /\*\* All the parts including the interchangeables. _/
  partsById: {
  [partId: string]: Part;
  };
  }
  /\*\* A part. Windshields will always be `SinglePart`, but back glass
- could be any three of these.
-
- These are discriminated on the "kind" property as shown below.
  _/
  type Part = SinglePart | BackLeftPart | BackAssemblyCenterPart;
  interface SinglePart
  {
  kind: "Single";
  oemPartNumbers: string[];
  amNumber: string;
  /\*\* Index into `allParts` on the response to get the interchangeable. _/
  interchangeables: string[];
  calibrations: GlassPartCalibration[];
  features: GlassPartFeature[];
  photoUrls: string[];
  }
  interface BackLeftRightPart
  {
  kind: "LeftRight";
  left: SinglePart;
  right: SinglePart;
  }
  interface BackAssemblyCenterPart
  {
  kind: "AssemblyCenter";
  center: SinglePart;
  assembly: SinglePart;
  }
  interface GlassPartFeature
  {
  /** A unique identifier for the feature. \*/
  featureId: string;
  /** English name of the feature. _/
  name: string;
  }
  interface Sensor
  {
  /\*\* A unique identifier for the sensor. _/
  sensorId: string;
  /** English name of the sensor. \*/
  name: string;
  }
  interface CalibrationType
  {
  /** A unique identifier for the calibration type. _/
  calibrationTypeId: string;
  /\*\* English name of the calibration type. _/
  name: string;
  }
  interface GlassPartCalibration
  {
  /** Type of calibration. \*/
  calibrationType: CalibrationType;
  /** Sensor that needs calibrating. \*/
  sensor: Sensor;
  }
  Error Responses
   204 - No content – Means the provided VIN had wasn’t found.
   401 – Unauthorized – Details to help you debug this are in the response body.
   429 – Too many requests – You’re being rate limited for sending too many requests in a short
  period of time. You probably won’t ever hit this.
   4xx – The message will be returned back as a JSON object with a “message” property. An
  example of when this will occur is if you submitted an invalid VIN or provided bad data.
   500 – Internal server error – Something went wrong on our side.

Plate Decode API
Instead of providing a VIN, it’s also possible to provide a license plate number and state/province.
Url: https://api.myautobolt.com/v2/decode-plate
Method: POST
Request Headers:
 Authorization: <your authorization header string>
 Content-Type: application/json
 Accept: application/json
Request body:
{
"country": "US",
"plate": {
"number": "<license plate number goes here>",
"state": "<two letter state or province goes here>"
},
"kind": "Windshield"
}
Properties:
 country – Either “CA” for Canada, “US” for United States, or “User” to use the settings from your
user’s account. This should be set based on the origin of the vehicle.
 plate.number – The license plate number (prefer providing no spaces or dashes)
 plate.state – Two letter state or province code
o https://www.faa.gov/air_traffic/publications/atpubs/cnt_html/appendix_a.html
o https://en.wikipedia.org/wiki/Canadian_postal_abbreviations_for_provinces_and_territ
ories
 kind – Either “Back” for back glass or “Windshield” for windshield.
Response: Same as the “decode” API above, but a successful response will also return the VIN as a “vin”
property.
Part API
Url: https://api.myautobolt.com/v2/part/{oemPartNumber}
Method: GET
Request Headers:
 Authorization: <your authorization header string>
 Content-Type: application/json
 Accept: application/json
400 Response: Bad Request
429 Response: Too many requests. Please wait a little bit and try again.
200 Response:
 Windshield parts will always be ”Single”, but back glass will be either “Single”, “LeftRight”, or
“AssemblyCenter” depending on the type of vehicle.
 A single result in the “parts” property means we were able to decode to a single part. If multiple
parts are there, that means it was inconclusive.
Here is the response represented as TypeScript interfaces (with PartResponse being the object that’s
returned):
interface PartResponse
{
/\*\* Parts that matched the provided number.

-
- Index this value into "partsById" to get the part. _/
  parts: string[];
  /\*\* All the parts including the interchangeables. _/
  partsById: {
  // see above for the definition of Part
  [partId: string]: Part;
  };
  }

Plate to VIN API
Instead of providing a VIN, it’s also possible to provide a license plate number and state/province.
Url: https://api.myautobolt.com/v2/decode-plate
Method: POST
Request Headers:
 Authorization: <your authorization header string>
 Content-Type: application/json
 Accept: application/json
Request body:
{
"number": "<license plate number goes here>",
"state": "<two letter state or province goes here>"
}
400 Response: Bad Request
429 Response: Too many requests. Please wait a little bit and try again.
204 Response: No content
200 Response: An object that can be described with the following interface.
interface PlateToVinResult
{
vin: string;
year: number;
make: string;
model: string;
bodyStyle: string;
}
