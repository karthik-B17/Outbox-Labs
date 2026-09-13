import { Client } from '@elastic/elasticsearch';
import { config } from './index';

export const elasticClient = new Client({
  node: config.elastic.url,
});

export const INDEX_NAME = 'emails';

export const createEmailIndex = async () => {
  try {
    const exists = await elasticClient.indices.exists({ index: INDEX_NAME });
    if (!exists) {
      await elasticClient.indices.create({
        index: INDEX_NAME,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              from: { type: 'keyword' },
              to: { type: 'keyword' },
              subject: { type: 'text' },
              body: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      console.log('Elasticsearch index created');
    }
  } catch (error) {
    console.error('Elasticsearch index creation failed:', error);
  }
};
