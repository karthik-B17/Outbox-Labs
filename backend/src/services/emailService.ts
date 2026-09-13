import nodemailer from 'nodemailer';
import { elasticClient, INDEX_NAME } from '../config/elastic';
import prisma from '../config/database';
import { EmailStatus } from '@prisma/client';

let transporter: nodemailer.Transporter;

export const createTransporter = async () => {
  const testAccount = await nodemailer.createTestAccount();
  console.log('Ethereal Email credentials:');
  console.log('User:', testAccount.user);
  console.log('Pass:', testAccount.pass);

  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return transporter;
};

export const sendEmail = async (emailData: {
  to: string;
  subject: string;
  body: string;
  from: string;
}) => {
  if (!transporter) {
    await createTransporter();
  }

  const mailOptions = {
    from: emailData.from,
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.body,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Email sent:', nodemailer.getTestMessageUrl(info));

  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  };
};

export const indexEmail = async (email: {
  id: string;
  userId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt?: Date;
  sentAt?: Date;
  createdAt: Date;
}) => {
  try {
    await elasticClient.index({
      index: INDEX_NAME,
      id: email.id,
      body: email,
    });
  } catch (error) {
    console.error('Elasticsearch indexing failed:', error);
  }
};

export const searchEmails = async (
  userId: string,
  query: string,
  status?: string
) => {
  try {
    const must: any[] = [{ term: { userId } }];

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['subject', 'body', 'to'],
        },
      });
    }

    if (status) {
      must.push({ term: { status } });
    }

    const result = await elasticClient.search({
      index: INDEX_NAME,
      body: {
        query: {
          bool: { must },
        },
        sort: [{ createdAt: { order: 'desc' } }],
      },
    });

    return result.hits.hits.map((hit: any) => hit._source);
  } catch (error) {
    console.error('Elasticsearch search failed:', error);
    return [];
  }
};
