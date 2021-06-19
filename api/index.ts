import express from 'express';
import morgan from 'morgan';
import AWS from 'aws-sdk';
import {body, validationResult} from 'express-validator';
// environment settings
const tableName = process.env.TABLE_NAME;

if (tableName === '') {
  throw Error(
      'Unable to dynamo table name. Please set TABLE_NAME env variable',
  );
}

const DDB = new AWS.DynamoDB();
const api = express();

interface todoItem {
  name: string;
  description: string;
}

api.use(morgan('common'));
api.use(express.json());

api.post(
    '/api/todo',
    body('name').isLength({min: 3}),
    body('description').isLength({min: 3}),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).send('Invalid body');
      }
      const statement = `INSERT INTO todo value {'name': ?,'description': ?};`;
      try {
        await DDB.executeStatement({
          Statement: statement,
          Parameters: [
            {'S': req.body.name as string},
            {'S': req.body.description as string},
          ],
        }).promise();
        await res.send('success');
      } catch {
        await res.status(500).send('insertion went wrong');
      }
    },
);

api.get('/api/todo', async (req, res) => {
  let statement = '';
  if (req.query.name) {
    statement = `SELECT * FROM ${tableName} WHERE name=${req.query.name};`;
  } else {
    statement = `SELECT * FROM ${tableName};`;
  }

  const results = await DDB.executeStatement({
    Statement: statement,
  }).promise();
  const todoItems: todoItem[] = [];
  for (const item of results.Items as AWS.DynamoDB.ItemList) {
    todoItems.push({
      name: item.name.S as string,
      description: item.description.S as string,
    });
  }
  await res.json(todoItems);
});

api.listen(process.env.PORT || 3000, () => {
  console.log(`application listening on ${process.env.PORT || 3000}`);
});
