// holds our dependecies
import { SpamDetectionController } from "./controllers/spamDetectorController";
import { Router } from "./routes/spamDetectorRoutes";
import { SpamDetectionService } from "./services/spamDetectorService";
import { CacheService } from "./services/cacheService";
import { RulesEngine } from "./services/rulesEngine";
import { Logger } from "./types";
import {DatabaseService} from "./services/database";
import {MessageService} from "./services/messageQueue"

export class Container {
  public readonly logger: Logger = console;
  public readonly cacheClient = new CacheService(this.logger );
  public readonly database = new DatabaseService();
  public readonly messageQueue = new MessageService();
  //domain services
  public readonly rulesEngine = new RulesEngine(this.logger, this.cacheClient);
  public readonly spamDetectionService = new SpamDetectionService(
    this.rulesEngine,
    this.cacheClient,
    this.database,
    this.messageQueue,
    this.logger,
  );
  //controllers
  public readonly spamController = new SpamDetectionController(
    this.spamDetectionService,
    this.logger,
  );
  //route
  public readonly router = new Router(this.spamController, this.logger, this.cacheClient);
}
