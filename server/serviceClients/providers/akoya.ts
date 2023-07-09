import {
  Challenge,
  ChallengeType,
  Connection,
  ConnectionStatus,
  CreateConnectionRequest,
  Credential,
  Institution,
  Institutions,
  ProviderApiClient,
  UpdateConnectionRequest,
  VcType,
} from '@/../../shared/contract';
import { akoyaProd, akoyaSandbox } from './configuration';

const db = require('../storageClient');
const CryptoJS = require("crypto-js");
const {  v4: uuidv4, } = require('uuid');

import * as config from '../../config';
import * as logger from '../../infra/logger';

import AkoyaClient from '../akoyaClient';

export class AkoyaApi implements ProviderApiClient {
  sandbox: boolean;
  apiClient: any;

  constructor(sandbox: boolean) {
    this.sandbox = sandbox;
    this.apiClient = new AkoyaClient(sandbox ? akoyaSandbox : akoyaProd);
  }

  GetInstitutionById(id: string): Promise<Institution> {
    return Promise.resolve({
      id, 
      name: null,
      logo_url: null,
      url: null,
      oauth: true,
      provider: this.apiClient.apiConfig.provider
    })
  }

  async ListInstitutionCredentials(id: string): Promise<Array<Credential>> {
    return Promise.resolve([]);
  }

  async ListConnectionCredentials(connectionId: string, userId: string): Promise<Credential[]> {
    return Promise.resolve([]);
  }

  ListConnections(userId: string): Promise<Connection[]> {
    return Promise.resolve([]);
  }

  async CreateConnection(
    request: CreateConnectionRequest
  ): Promise<Connection | undefined> {
    const request_id = uuidv4();
    const obj = {
      id: request_id,
      is_oauth: true,
      credentials: [] as any[],
      institution_code: request.institution_id,
      oauth_window_uri: this.apiClient.getOauthUrl(request.institution_id, this.apiClient.client_redirect_url, request_id),
      provider: this.apiClient.apiConfig.provider,
      status: ConnectionStatus.PENDING
    }
    await db.set(request_id, obj);
    return obj;
  }

  DeleteConnection(id: string): Promise<void> {
    return db.set(id, null);
  }

  async UpdateConnection(
    request: UpdateConnectionRequest
  ): Promise<Connection> {
    //in akoya this is used to receive oauth response and not matching the Connection class schema
    let actualObj = request as any;
    const {state: connection_id, code } = actualObj;
    logger.info(`Received akoya oauth redirect response ${connection_id}`)
    let connection = await db.get(connection_id)
    if(!connection){
      return null;
    }
    if(code){
      connection.status = ConnectionStatus.CONNECTED
      connection.guid = connection_id
      connection.id = code
    }
    await db.set(connection_id, connection)
    return connection;
  }

  GetConnectionById(connectionId: string): Promise<Connection> {
    return db.get(connectionId);
  }

  async GetConnectionStatus(connectionId: string, jobId: string): Promise<Connection> {
    return this.apiClient.getConnection(connectionId);
  }

  async AnswerChallenge(request: UpdateConnectionRequest, jobId: string): Promise<boolean> {
    return true;
  }

  async ResolveUserId(user_id: string){
    return user_id;
  }
  
  async GetVc(
    connection_id: string,
    type: VcType,
    userId?: string
  ): Promise<object> {
    return null;
  }
}

// const tokens = {
//   token_type: 'bearer',
//   expires_in: 86399,
//   refresh_token: 'ChltcWtwdTJvdTcyNjc1ZnQ2a3pvdnh2am9uEhluNGl1dGp2NDdiYzY0cXg2eXpzY2x3cnoz',
//   id_token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImQxMWU3ODExN2VkN2U3MDc1ZWRkY2I2MDcyNWQ1ZWNlOWU0NmM0NTAifQ.eyJpc3MiOiJodHRwczovL3NhbmRib3gtaWRwLmRkcC5ha295YS5jb20vIiwic3ViIjoiQ2dodGFXdHZiVzlmTVJJR2JXbHJiMjF2IiwiYXVkIjoianU3eWFycmxrbzdkcmppaHJ6aWxtZzcyZyIsImV4cCI6MTY4ODIyNDAxNSwiaWF0IjoxNjg4MTM3NjE1LCJhdF9oYXNoIjoiNzMwQmh0M1RDUVBDbWdCVVd4VDAwUSIsImVtYWlsIjoibWlrb21vXzEiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsIm5hbWUiOiJtaWtvbW9fMSJ9.KtrHTx2NeJ7PKEFP5oWKPXhzo8Wz3B2MH0o6ONS9EAQrUWOqJP0DRlF1ZfjTOqw4MOxUbLfgg7PU-t03YYM8eTp85A_sX2BpIuTg83s_LKbUeBRSjDnKpXEpvblOFB6JQUdf3hrZ-Q8VHEme3t5ToFbwKdjkG3kx7Lj3tKSEfXEK3uqyvvgQlPTr21IWLkn9DJp9sRP1GnJQXZPXH68Cj-bbQYZpQumB3reRM_MYYJkWslWlQr_iVaJY5x1GRZzLZjClwiuGKG09f_eVN3tkqfs4T6Rk-AZpwt8X2Bpo0OU9_o6DuaV2-aNwf9-Tr9qJLFcBRCiPXissTEzbo0Bevw'
// }

// let client = new AkoyaClient(akoyaSandBox);
// client.getIdToken('q7e63oxh63hzjwb4bcfwaa4hr').then(res => {
//   console.log(res)
// })

// client.getPayments('mikomo', 1781013604, tokens.id_token ).then(res => {
//   console.log(res)
// })

// client.refreshToken(tokens.refresh_token).then(res => {
//   console.log(res)
// })

