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
import { finicityProd, finicitySandbox } from './configuration';

const db = require('../storageClient');
const CryptoJS = require("crypto-js");
const {  v4: uuidv4, } = require('uuid');

import * as config from '../../config';
import * as logger from '../../infra/logger';

import FinicityClient from '../finicityClient';

export class FinicityApi implements ProviderApiClient {
  sandbox: boolean;
  apiClient: any;

  constructor(sandbox: boolean) {
    this.sandbox = sandbox;
    this.apiClient = new FinicityClient(sandbox ? finicitySandbox : finicityProd);
  }

  async GetInstitutionById(id: string): Promise<Institution> {
    const ins = this.apiClient.getInstitution(id);
    return {
      id, 
      name: ins?.name,
      logo_url: ins?.urlLogonApp,
      url: ins?.urlHomeApp,
      oauth: true,
      provider: this.apiClient.apiConfig.provider
    }
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
    request: CreateConnectionRequest,
    user_id: string
  ): Promise<Connection | undefined> {
    const request_id = uuidv4();
    const obj = {
      id: request_id,
      is_oauth: true,
      credentials: [] as any[],
      institution_code: request.institution_id,
      oauth_window_uri: await this.apiClient.generateConnectLiteUrl(request.institution_id, user_id, request_id),
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
    //in finicity this is used to receive webhook response and not matching the Connection class schema
    let actualObj = request as any;
    const {connection_id, eventType} = actualObj;
    let institutionLoginId = false;
    switch(eventType){
      case 'added':
        institutionLoginId = actualObj.payload.accounts?.[0];
        break;
    }
    logger.info(`Received finicity webhook response ${connection_id}`)
    let connection = await db.get(connection_id)
    if(!connection){
      return null;
    }
    if(institutionLoginId){
      connection.status = ConnectionStatus.CONNECTED
      connection.guid = connection_id
      connection.id = institutionLoginId
    }
    await db.set(connection_id, connection)
    return connection;
  }

  GetConnectionById(connectionId: string): Promise<Connection> {
    return db.get(connectionId);
  }

  async GetConnectionStatus(connectionId: string, jobId: string): Promise<Connection> {
    return db.get(connectionId);
  }

  async AnswerChallenge(request: UpdateConnectionRequest, jobId: string): Promise<boolean> {
    return true;
  }

  async ResolveUserId(user_id: string){
    logger.debug('Resolving UserId: ' + user_id);
    const finicityUser = await this.apiClient.getCustomer(user_id);
    if(finicityUser){
      logger.trace(`Found existing finicity customer ${finicityUser.id}`)
      return finicityUser.id
    }
    logger.trace(`Creating finicity user ${user_id}`)
    let ret = await this.apiClient.createCustomer(user_id)
    if(ret){
      return ret.id
    }
    logger.trace(`Failed creating finicity user, using user_id: ${user_id}`)
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

// console.log(finicitySandbox)
// console.log(finicityProd)
let client = new FinicityClient(finicitySandbox);
// client.getAuthToken().then((res: any) => {
//   console.log(res)
// })

// client.getCustomer('customerusername12').then(res => {
//   console.log(res)
// })

// client.generateConnectLiteUrl('6030781868', 102176).then(res => {
// //client.generateConnectUrl('6030781868').then(res => {
//   console.log(res)
// })