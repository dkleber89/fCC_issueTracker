"use strict";
require("dotenv").config();
const { Client } = require("pg");
const isISODate = require("is-iso-date");

const NOT_A_VALID_KEY_MESSAGE = "Not a valid Key";

module.exports = function (app) {
  const client = new Client({
    connectionString: process.env.POSTGRES_CONNECTION_STRING,
  });

  client.connect();

  app
    .route("/api/issues/:project")

    .get(async function (req, res) {
      const {
        params: { project },
        query,
      } = req;

      const filterArray = Object.entries(query).map(([key, value]) => {
        if (value === "true" || value === "false") {
          return [key, value === "true"];
        }

        if (isISODate(value)) {
          return [key, new Date(value)];
        }

        return [key, value];
      });

      try {
        const queryString = ["SELECT * from issues WHERE project=$1"]
          .concat(
            filterArray.map(([key], index) => {
              if (key.match(/^[a-zA-Z_]+$/)) {
                return ` AND ${key}=$${index + 2}`;
              } else {
                throw new Error(NOT_A_VALID_KEY_MESSAGE);
              }
            })
          )
          .join("");

        const queryResponse = await client.query(queryString, [
          project,
          ...filterArray.map(([_key, value]) => value),
        ]);

        res.json(queryResponse.rows);
      } catch (e) {
        console.error(e);

        if (e.message === NOT_A_VALID_KEY_MESSAGE) {
          res.status(400).send(e.message);
        } else {
          res.status(500).end();
        }
      }
    })

    .post(async function (req, res) {
      let {
        params: { project },
        body,
      } = req;

      if (!body.issue_title || !body.issue_text || !body.created_by) {
        res.json({ error: "required field(s) missing" });

        return;
      }

      const dataArray = Object.entries(body).filter(
        ([key, value]) => value.length >= 1
      );

      const insertQueryString =
        "INSERT INTO issues(project, issue_title, issue_text, created_by, assigned_to, status_text) VALUES($1, $2, $3, $4, $5, $6)";

      try {
        const selectQueryArray = [
          "SELECT * FROM issues WHERE project=$1",
        ].concat(
          dataArray.map(([key, value], index) => {
            if (key.match(/^[a-zA-Z_]+$/)) {
              return ` AND ${key}=$${index + 2}`;
            } else {
              throw new Error(NOT_A_VALID_KEY_MESSAGE);
            }
          })
        );

        if (
          !selectQueryArray.find((element) => element.includes("assigned_to"))
        ) {
          selectQueryArray.push(" AND assigned_to IS NULL");
        }

        if (
          !selectQueryArray.find((element) => element.includes("status_text"))
        ) {
          selectQueryArray.push(" AND status_text IS NULL");
        }

        const selectQueryString = selectQueryArray.join("");

        const insertQueryResponse = await client.query(insertQueryString, [
          project,
          body.issue_title,
          body.issue_text,
          body.created_by,
          body.assigned_to && body.assigned_to.length >= 1
            ? body.assigned_to
            : null,
          body.status_text && body.status_text.length >= 1
            ? body.status_text
            : null,
        ]);

        const selectQueryResponse = await client.query(selectQueryString, [
          project,
          ...dataArray.map((element) => element[1]),
        ]);

        const responseObject = selectQueryResponse.rows[0];

        if (responseObject["assigned_to"] === null) {
          responseObject["assigned_to"] = "";
        }

        if (responseObject["status_text"] === null) {
          responseObject["status_text"] = "";
        }

        res.json(responseObject);
      } catch (e) {
        console.error(e);

        res.json({ error: "could not create" });
      }
    })

    .put(async function (req, res) {
      let {
        params: { project },
        body,
      } = req;

      if (!body._id) {
        res.json({ error: "missing _id" });

        return;
      }

      if (
        !body.issue_title &&
        !body.issue_text &&
        !body.created_by &&
        !body.assigned_to &&
        !body.status_text
      ) {
        res.json({ error: "no update field(s) sent", _id: body._id });

        return;
      }

      const dataArray = Object.entries(body)
        .filter(
          ([key, value]) =>
            value.length >= 1 &&
            key !== "_id" &&
            key !== "created_on" &&
            key !== "updated_on"
        )
        .map(([key, value]) => {
          if (value === "true" || value === "false") {
            return [key, value === "true"];
          }

          return [key, value];
        });

      try {
        const updateQueryString = ["UPDATE issues SET"]
          .concat(
            dataArray.map(([key], index) => {
              return `${index >= 1 ? "," : ""} ${key}=$${index + 1}`;
            }),
            [
              `, updated_on=$${dataArray.length + 1} WHERE _id=$${
                dataArray.length + 2
              }`,
            ]
          )
          .join("");

        const updateQueryResult = await client.query(updateQueryString, [
          ...dataArray.map((element) => element[1]),
          new Date(),
          body._id,
        ]);

        if (updateQueryResult.rowCount === 1) {
          res.json({ result: "successfully updated", _id: body._id });
        } else {
          throw new Error({ error: "could not update", _id: body._id });
        }
      } catch (e) {
        console.error(e);

        res.json({ error: "could not update", _id: body._id });
      }
    })

    .delete(async function (req, res) {
      let {
        params: { project },
        body,
      } = req;

      if (!body._id) {
        res.json({ error: "missing _id" });

        return;
      }

      try {
        const deleteQueryResult = await client.query(
          "DELETE FROM issues WHERE _id=$1",
          [body._id]
        );

        if (deleteQueryResult.rowCount === 1) {
          res.json({ result: "successfully deleted", _id: body._id });
        } else {
          throw new Error({ error: "could not delete", _id: body._id });
        }
      } catch (e) {
        console.error(e);

        res.json({ error: "could not delete", _id: body._id });
      }
    });

  //404 Not Found Middleware
  app.use(function (req, res, next) {
    res.status(404).type("text").send("Not Found");
  });
};
