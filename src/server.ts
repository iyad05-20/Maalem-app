import { createApp } from "./app";

const app = createApp();
const port = process.env.PORT ? Number(process.env.PORT) : 3002;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`vork-wallet listening on :${port}`);
});
