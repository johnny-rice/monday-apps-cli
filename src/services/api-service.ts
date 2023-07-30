import crypto from 'node:crypto';
import https from 'node:https';

import axios, { AxiosError } from 'axios';
import { ZodObject } from 'zod/lib/types';

import { CONFIG_KEYS } from 'consts/config';
import { ACCESS_TOKEN_NOT_FOUND } from 'consts/messages';
import { ConfigService } from 'services/config-service.js';
import { getAppsDomain } from 'services/env-service.js';
import { HttpError } from 'types/errors';
import { BaseErrorResponse, BaseResponseHttpMetaData, ExecuteParams } from 'types/services/api-service';
import logger from 'utils/logger';

const DEFAULT_TIMEOUT = 10 * 1000;

const validateResponseIfError = (response: object, schemaValidator?: ZodObject<any>): object => {
  if (schemaValidator) {
    const parsedResponse = schemaValidator.safeParse(response);
    if (parsedResponse.success) {
      return parsedResponse.data;
    }

    const { error } = parsedResponse;
    logger.debug(error, 'Invalid response');
    throw new Error(`An unknown error occurred. Please contact support.`);
  }

  return response;
};

const handleErrors = (error: any | Error | AxiosError): never => {
  const defaultErrorMessage = `Unexpected error occurred while communicating with the remote server`;
  if (error instanceof AxiosError) {
    const errorAxiosResponse = error.response?.data as BaseErrorResponse;
    const statusCode = error.response?.status;
    const title = errorAxiosResponse?.title;
    const message = errorAxiosResponse?.message || defaultErrorMessage;
    throw new HttpError(message, title, statusCode);
  } else if (error instanceof Error) {
    const message = error.message || defaultErrorMessage;
    throw new HttpError(message);
  } else {
    throw new HttpError('An unknown error occurred.');
  }
};

export async function execute<T extends BaseResponseHttpMetaData>(
  params: ExecuteParams,
  schemaValidator?: ZodObject<any>,
): Promise<T> {
  const DEBUG_TAG = 'api_service';
  const accessToken = ConfigService.getConfigDataByKey(CONFIG_KEYS.ACCESS_TOKEN);
  if (!accessToken) {
    logger.error(ACCESS_TOKEN_NOT_FOUND);
    throw new Error(ACCESS_TOKEN_NOT_FOUND);
  }

  const { body: data, query, url, method, timeout, headers } = params;
  const headersWithToken = { ...headers, Authorization: accessToken };
  const baseURL = getAppsDomain();
  try {
    const httpsAgent = new https.Agent({
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
      rejectUnauthorized: false,
    });

    const response = await axios.request<T>({
      httpsAgent,
      method,
      baseURL,
      url,
      data,
      headers: headersWithToken,
      params: query,
      timeout: timeout || DEFAULT_TIMEOUT,
    });

    logger.debug({ res: response }, DEBUG_TAG);
    const result = { ...response.data, statusCode: 200, headers: response.headers };
    const validatedResult = validateResponseIfError(result, schemaValidator);
    return (validatedResult as T) || result;
  } catch (error: any | Error | AxiosError) {
    return handleErrors(error);
  }
}
