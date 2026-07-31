import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the API info object', () => {
      const result = appController.getHello();
      expect(result).toMatchObject({
        name: 'Ethiopian Contract Reader API',
        version: '1.0.0',
        description: expect.any(String),
      });
    });
  });

  describe('health', () => {
    it('should return ok status with a timestamp', () => {
      const result = appController.health();
      expect(result.status).toBe('ok');
      expect(result.name).toBe('Ethiopian Contract Reader API');
      expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
    });
  });
});
