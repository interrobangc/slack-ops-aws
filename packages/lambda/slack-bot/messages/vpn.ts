import { directMention } from '@slack/bolt';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const processedMessages: Set<string> = new Set();

const lambdaConfig: { endpoint?: string } = process.env.AWS_ENDPOINT ? { endpoint: process.env.AWS_ENDPOINT } : {};
const lambdaClient = new LambdaClient(lambdaConfig);

const ENV_DEV = 'development';
const ENV_STAGE = 'staging';
const ENV_PROD = 'production';

const envs = [ENV_DEV, ENV_STAGE, ENV_PROD];

const NET_DB = 'db';
const NET_PRIVATE = 'private';

const nets = [NET_DB, NET_PRIVATE];

const netLookup: Record<string, string> = {
  db: NET_DB,
  database: NET_DB,
  private: NET_PRIVATE,
  priv: NET_PRIVATE,
};

const envLookup: Record<string, string> = {
  dev: ENV_DEV,
  development: ENV_DEV,
  staging: ENV_STAGE,
  stage: ENV_STAGE,
  prod: ENV_PROD,
  production: ENV_PROD,
};

const envRegex = /(stage|staging|production|prod|dev|development)/i;
const netsRegex = /(db|database|private|priv)/i;
const messageRegex = /vpn/i;

const getEnvFromMessage = (message: string): string | null => {
  const matches = message.match(envRegex);

  return matches ? envLookup[matches[0]] : null;
};

const getNetsFromMessage = (message: string): Array<string> | null => {
  const matches = message.match(netsRegex);

  if (!matches) return null;

  const nets: Set<string> = new Set();

  matches.map(m => nets.add(netLookup[m]));

  return Array.from(nets);
};

const getSelectedOptions = (opt: string | string[]): any | undefined => {
  if (!opt) return;

  if (Array.isArray(opt)) {
    return opt.map(o => generateOption(o));
  }

  return generateOption(opt);
};

const generateOption = (opt: string): any => {
  return {
    text: {
      type: 'plain_text',
      text: opt,
    },
    value: opt,
  };
};

const generateMessage = async ({ message, selectedEnv, selectedNets }: any) => {
  console.log(getSelectedOptions(selectedNets));
  return {
    blocks: [
      {
        type: 'section',
        block_id: 'section',
        text: {
          type: 'mrkdwn',
          text: `Hey <@${message.user}>! Which VPN do you want me to associate for you?`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'input',
        block_id: 'env_select_input',
        label: {
          type: 'plain_text',
          text: 'Environment',
        },
        element: {
          action_id: 'env_select',
          type: 'static_select',
          placeholder: {
            type: 'plain_text',
            text: 'Select Environment...',
          },
          initial_option: getSelectedOptions(selectedEnv),
          options: envs.map(e => generateOption(e)),
        },
      },
      {
        type: 'input',
        block_id: 'net_select_input',
        label: {
          type: 'plain_text',
          text: 'Networks',
        },
        element: {
          action_id: 'net_select',
          type: 'multi_static_select',
          placeholder: {
            type: 'plain_text',
            text: 'Select Networks...',
          },
          initial_options: getSelectedOptions(selectedNets),
          options: nets.map(n => generateOption(n)),
        },
      },
      {
        type: 'actions',
        block_id: 'button_actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: `Associate VPN`,
            },
            action_id: 'vpn_associate',
          },
        ],
      },
    ],
    thread_ts: message.ts,
  };
};

const respondToMessage = async ({ message, say }: any) => {
  console.dir(message);
  if (processedMessages.has(message.client_msg_id)) return;

  processedMessages.add(message.client_msg_id);

  const selectedEnv = getEnvFromMessage(message.text);
  const selectedNets = getNetsFromMessage(message.text);

  const msg = await generateMessage({ message, selectedEnv, selectedNets });

  say(msg);
};

const handleVpnMessage = async (app: any) => {
  app.message(
    directMention(),
    messageRegex,
    async ({ message, say }: any) => await respondToMessage({ message, say }),
  );

  app.action('env_select', async ({ ack }: any) => {
    await ack();
  });

  app.action('net_select', async ({ ack }: any) => {
    await ack();
  });

  app.action('vpn_associate', async ({ body, ack, say, value, message }: any) => {
    await ack();

    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: `${process.env.NODE_ENV}-slack-bot-associate-vpn`,
        InvocationType: 'Event',
        Payload: JSON.stringify({ body }),
      }),
    );
  });
};

export { handleVpnMessage };
