import { getRequest, postRequest, putRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import { httpClient } from "@/shared/api/core/httpClient";
import {
  exploracionElementosResponseSchema,
  exploracionElementoPayloadSchema,
  exploracionElementoWriteResponseSchema,
  exploracionLaboratoriosResponseSchema,
  exploracionMuestraPayloadSchema,
  exploracionMuestrasTodasResponseSchema,
  exploracionMuestraWriteResponseSchema,
  type ExploracionElementoPayload,
  type ExploracionMuestraPayload
} from "@/features/exploraciones/model/muestra.schema";

export async function createExploracionMuestra(payload: ExploracionMuestraPayload) {
  const body = exploracionMuestraPayloadSchema.parse(payload);
  const bodyWithAliases = {
    ...body,
    ubicacion: {
      ...body.ubicacion,
      Norte: body.ubicacion.norte,
      ELEVACION: body.ubicacion.elevacion
    }
  };
  return postRequest({
    url: apiEndpoints.exploraciones.muestras,
    body: bodyWithAliases,
    schema: exploracionMuestraWriteResponseSchema
  });
}

export async function updateExploracionMuestra(id: string, payload: ExploracionMuestraPayload) {
  const body = exploracionMuestraPayloadSchema.parse(payload);
  const bodyWithAliases = {
    ...body,
    ubicacion: {
      ...body.ubicacion,
      Norte: body.ubicacion.norte,
      ELEVACION: body.ubicacion.elevacion
    }
  };
  return putRequest({
    url: apiEndpoints.exploraciones.muestraById(id),
    body: bodyWithAliases,
    schema: exploracionMuestraWriteResponseSchema
  });
}

export async function getExploracionesMuestrasTodas() {
  const response = await httpClient.get(apiEndpoints.exploraciones.muestrasTodas);
  const payload = response.data as unknown;

  const normalized =
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    payload.data &&
    typeof payload.data === "object" &&
    "data" in payload.data
      ? payload.data
      : payload;

  return exploracionMuestrasTodasResponseSchema.parse(normalized);
}

export async function getExploracionesElementos() {
  return getRequest({
    url: apiEndpoints.exploraciones.elementos,
    schema: exploracionElementosResponseSchema
  });
}

export async function createExploracionElemento(payload: ExploracionElementoPayload) {
  const body = exploracionElementoPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.exploraciones.elementos,
    body,
    schema: exploracionElementoWriteResponseSchema
  });
}

export async function getExploracionesLaboratorios() {
  return getRequest({
    url: apiEndpoints.exploraciones.laboratorios,
    schema: exploracionLaboratoriosResponseSchema
  });
}
