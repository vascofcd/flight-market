import {
  cre,
  ok,
  type Runtime,
  type HTTPSendRequester,
  consensusIdenticalAggregation,
} from "@chainlink/cre-sdk";
import type {
  Config,
  FirestoreWriteData,
  FirestoreWriteResponse,
  FlightAPIResponse,
  SignupNewUserResponse,
} from "../types";

type AirlabsFlightPayload = {
  request: {
    id: string;
  };
  response?: {
    flight_icao?: string;
    dep_time_utc?: string;
    delayed?: number;
    dep_delayed?: number;
    arr_delayed?: number;
    status?: string;
  };
};

export function writeToFirestore(
  runtime: Runtime<Config>,
  txHash: string,
  flightId: string,
  response: FlightAPIResponse,
): FirestoreWriteResponse {
  const firestoreApiKey = runtime
    .getSecret({ id: "FIREBASE_API_KEY" })
    .result().value;
  const firestoreProjectId = runtime
    .getSecret({ id: "FIREBASE_PROJECT_ID" })
    .result().value;

  const httpClient = new cre.capabilities.HTTPClient();

  const tokenResult: SignupNewUserResponse = httpClient
    .sendRequest(runtime, postFirebaseIdToken(
        firestoreApiKey,
      ), consensusIdenticalAggregation<SignupNewUserResponse>())(runtime.config)
    .result();

  const writeResult: FirestoreWriteResponse = httpClient
    .sendRequest(
      runtime,
      postFirestoreWrite(
        tokenResult.idToken,
        firestoreProjectId,
        flightId,
        response,
        txHash,
      ),
      consensusIdenticalAggregation<FirestoreWriteResponse>(),
    )(runtime.config)
    .result();

  return writeResult;
}

const postFirebaseIdToken =
  (firebaseApiKey: string) =>
  (sendRequester: HTTPSendRequester, config: Config): SignupNewUserResponse => {
    const dataToSend = {
      returnSecureToken: true,
    };

    const bodyBytes = new TextEncoder().encode(JSON.stringify(dataToSend));
    const body = Buffer.from(bodyBytes).toString("base64");

    const request = {
      url: `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseApiKey}`,
      method: "POST" as const,
      body: body,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const resp = sendRequester.sendRequest(request).result();
    if (!ok(resp))
      throw new Error(
        `(resp) HTTP request failed with status: ${resp.statusCode}`,
      );

    const bodyText = new TextDecoder().decode(resp.body);
    const externalResp = JSON.parse(bodyText) as SignupNewUserResponse;

    return externalResp;
  };

const postFirestoreWrite =
  (
    idToken: string,
    projectId: string,
    flightId: string,
    response: FlightAPIResponse,
    txHash: string,
  ) =>
  (
    sendRequester: HTTPSendRequester,
    config: Config,
  ): FirestoreWriteResponse => {
    let parsed: AirlabsFlightPayload | null = null;

    try {
      parsed = JSON.parse(response.rawJsonString) as AirlabsFlightPayload;
    } catch {
      parsed = null;
    }

    const apiFlight = parsed?.response;

    const docId =
      apiFlight?.flight_icao && apiFlight?.dep_time_utc
        ? `${apiFlight.flight_icao}_${apiFlight.dep_time_utc}`.replace(
            /[^\w-]/g,
            "_",
          )
        : parsed?.request?.id || flightId;

    const delayedMinutes =
      apiFlight?.delayed ??
      apiFlight?.dep_delayed ??
      apiFlight?.arr_delayed ??
      0;

    const dataToSend: FirestoreWriteData = {
      fields: {
        statusCode: { integerValue: String(response.statusCode) },
        id: { stringValue: docId },
        flightId: { stringValue: flightId },
        delayed: { booleanValue: delayedMinutes > 0 },
        rawJsonString: { stringValue: response.rawJsonString },
        txHash: { stringValue: txHash },
        createdAt: { integerValue: Date.now() },
      },
    };

    const bodyBytes = new TextEncoder().encode(JSON.stringify(dataToSend));
    const body = Buffer.from(bodyBytes).toString("base64");

    const request = {
      url: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/demo/?documentId=${docId}`,
      method: "POST" as const,
      body: body,
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
    };

    const resp = sendRequester.sendRequest(request).result();

    if (!ok(resp)) {
      throw new Error(
        `(postFirestoreWrite) HTTP request failed with status: ${resp.statusCode}`,
      );
    }

    const bodyText = new TextDecoder().decode(resp.body);
    const externalResp = JSON.parse(bodyText) as FirestoreWriteResponse;

    return externalResp;
  };
