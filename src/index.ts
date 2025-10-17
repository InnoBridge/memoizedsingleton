import { Singleton, Prototype, Request } from '@/scopes/scopes';
import { Component, SingletonComponent, RequestComponent, PrototypeComponent, Scope } from '@/building-blocks/component';
import { RequestMetadata } from '@/components/request_metadata';
import { UserMetadata } from '@/components/user_metadata';
import { Authentication, AuthenticationMethod } from '@/components/authentication';
import { Config, getConfig } from '@/components/config';
import {
    initializeRequestContext,
    setApplicationContext,
    getApplicationContext,
    removeComponentFromApplicationContext,
    clearApplicationContext,
    hasRequestContext
} from '@/application-context/application_context';
import { Insert } from '@/building-blocks/assembler';

export {
    Singleton,
    Prototype,
    Request,
    Component,
    SingletonComponent,
    RequestComponent,
    PrototypeComponent,
    Scope,
    RequestMetadata,
    UserMetadata,
    Authentication,
    AuthenticationMethod,
    initializeRequestContext,
    setApplicationContext,
    getApplicationContext,
    removeComponentFromApplicationContext,
    clearApplicationContext,
    hasRequestContext,
    Config,
    getConfig,
    Insert
};
