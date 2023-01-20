// const { Lambda } = require('aws-sdk');
const { App } = require('@slack/bolt');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: {
    init: () => {},
  }, // no receiver
});

// const lambdaConfig = process.env.AWS_ENDPOINT ? { endpoint: process.env.AWS_ENDPOINT } : {};
// const lambda = new Lambda(lambdaConfig);

module.exports.handler = async ({ body }) => {
  const env = body.state.values.env_select_input.env_select.selected_option?.value;
  const nets = body.state.values.net_select_input.net_select.selected_options?.map(n => n.value);
  const thread_ts = body.message.thread_ts;
  const userId = body.user.id;
  const channel = body.channel.id;

  console.dir(body.state.values.net_select_input.net_select.selected_options);

  if (!env) {
    await app.client.chat.postMessage({
      channel,
      thread_ts,
      text: `<@${userId}>Please choose an environment!`,
    });
  }

  if (!nets.length) {
    await app.client.chat.postMessage({
      channel,
      thread_ts,
      text: `<@${userId}>Please choose at least one network!`,
    });
  }

  if (env && nets.length) {
    text = `<@${userId}> I'm associating the ${nets.join(', ')} network${
      nets.length > 1 ? 's' : ''
    } with the ${env} VPN for you!`;

    await app.client.chat.postMessage({
      channel,
      thread_ts,
      text,
    });
  }

  return { statusCode: 200 };
};
