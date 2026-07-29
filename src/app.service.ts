import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      name: 'Ethiopian Contract Reader API',
      description:
        'AI-powered contract analysis tool for Ethiopian contracts. Upload or paste contracts and get instant analysis on good and bad clauses.',
      version: '1.0.0',
      endpoints: {
        auth: {
          signup: 'POST /api/auth/signup',
          login: 'POST /api/auth/login',
        },
        contracts: {
          create: 'POST /api/contracts',
          upload: 'POST /api/contracts/upload',
          list: 'GET /api/contracts',
          get: 'GET /api/contracts/:id',
          update: 'PATCH /api/contracts/:id',
          delete: 'DELETE /api/contracts/:id',
        },
        analysis: {
          analyze: 'POST /api/analysis/analyze',
          list: 'GET /api/analysis',
          status: 'GET /api/analysis/:id',
          full: 'GET /api/analysis/:id/full',
        },
      },
    };
  }
}
