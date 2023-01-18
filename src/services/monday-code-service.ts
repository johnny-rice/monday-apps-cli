import https from 'node:https';
import crypto from 'node:crypto';
import axios, { AxiosError } from 'axios';
import { ExecuteParams, BaseErrorResponse, BaseResponseHttpMetaData } from '../types/services/monday-code-service.js';
import { ConfigService } from './config-service.js';
import Logger from '../utils/logger.js';
import { geMondayCodeDomain } from './env-service.js';
import { ACCESS_TOKEN_NOT_FOUND } from '../consts/messages.js';
import { ErrorMondayCode } from '../types/errors/index.js';
import logger from '../utils/logger.js';
import { ZodObject } from 'zod/lib/types';
const DEFAULT_TIMEOUT = 10 * 1000;

export async function execute<T extends BaseResponseHttpMetaData>(
  params: ExecuteParams,
  schemaValidator?: ZodObject<any>,
): Promise<T> {
  const accessToken = ConfigService.getConfigDataByKey('accessToken');
  if (!accessToken) {
    Logger.error(ACCESS_TOKEN_NOT_FOUND);
    throw new Error(ACCESS_TOKEN_NOT_FOUND);
  }

  const { body: data, query, url, method, timeout, headers } = params;
  const headersWithToken = { ...headers, Authorization: accessToken };
  const baseURL = geMondayCodeDomain();
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
    const result = { ...response.data, statusCode: 200, headers: response.headers };
    return (schemaValidator && (schemaValidator.parse(result) as T)) || result;
  } catch (error: any | Error | AxiosError) {
    logger.debug(error);
    const defaultErrorMessage = `Couldn't connect to the remote server "${baseURL}"`;
    if (error instanceof AxiosError) {
      const errorAxiosResponse = error.response?.data as BaseErrorResponse;
      const statusCode = error.response?.status;
      const title = errorAxiosResponse?.title;
      const message = errorAxiosResponse?.message || defaultErrorMessage;
      throw new ErrorMondayCode(message, title, statusCode);
    } else if (error instanceof Error) {
      const message = error.message || defaultErrorMessage;
      throw new ErrorMondayCode(message);
    } else {
      throw new ErrorMondayCode('An un known error occurred.');
    }
  }
}