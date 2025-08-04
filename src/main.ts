import { Container } from "./container";
import { App } from "./app";

const PORT: number = parseInt(process.env.PORT || "3000");
const container = new Container();
const app = new App(container);

app.listen(PORT);
