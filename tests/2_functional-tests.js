const chaiHttp = require("chai-http");
const chai = require("chai");
const assert = chai.assert;
const server = require("../server");
const isISODate = require("is-iso-date");

chai.use(chaiHttp);

suite("Functional Tests", function () {
  this.timeout(5000);

  test("Create an issue with every field", function (done) {
    const issueObject = {
      issue_title: "Title",
      issue_text: "Text",
      created_by: "Created",
      assigned_to: "Assigned",
      status_text: "Status",
    };

    chai
      .request(server)
      .keepOpen()
      .post("/api/issues/apitest")
      .send(issueObject)
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.issue_title, issueObject.issue_title);
        assert.equal(res.body.issue_text, issueObject.issue_text);
        assert.equal(res.body.created_by, issueObject.created_by);
        assert.equal(res.body.assigned_to, issueObject.assigned_to);
        assert.equal(res.body.status_text, issueObject.status_text);
        assert(isISODate(res.body.created_on));
        assert(isISODate(res.body.updated_on));

        done();
      });
  });

  test("Create an issue with only required fields", function (done) {
    const issueObject = {
      issue_title: "Title",
      issue_text: "Text",
      created_by: "Created",
    };

    chai
      .request(server)
      .keepOpen()
      .post("/api/issues/apitest")
      .send(issueObject)
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.issue_title, issueObject.issue_title);
        assert.equal(res.body.issue_text, issueObject.issue_text);
        assert.equal(res.body.created_by, issueObject.created_by);
        assert.equal(res.body.assigned_to, "");
        assert.equal(res.body.status_text, "");
        assert(isISODate(res.body.created_on));
        assert(isISODate(res.body.updated_on));

        done();
      });
  });

  test("Create an issue with missing required fields", function (done) {
    chai
      .request(server)
      .keepOpen()
      .post("/api/issues/apitest")
      .send({})
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { error: "required field(s) missing" });

        done();
      });
  });

  test("View issues on a project", function (done) {
    chai
      .request(server)
      .keepOpen()
      .get("/api/issues/apitest")
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isNotEmpty(res.body);
        assert(
          res.body.every(function (element) {
            return (
              element._id &&
              element.issue_title &&
              element.issue_text &&
              element.created_on &&
              element.updated_on &&
              element.created_by &&
              element.project &&
              typeof element.open === "boolean" &&
              (element.assigned_to === null || element.assigned_to) &&
              (element.status_text === null || element.status_text)
            );
          })
        );

        done();
      });
  });

  test("View issues on a project with one filter", function (done) {
    chai
      .request(server)
      .keepOpen()
      .get("/api/issues/apitest?issue_title=Title")
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isNotEmpty(res.body);
        assert(
          res.body.every(function (element) {
            return (
              element._id &&
              element.issue_title === "Title" &&
              element.issue_text &&
              element.created_on &&
              element.updated_on &&
              element.created_by &&
              element.project &&
              typeof element.open === "boolean" &&
              (element.assigned_to === null || element.assigned_to) &&
              (element.status_text === null || element.status_text)
            );
          })
        );

        done();
      });
  });

  test("View issues on a project with multiple filters", function (done) {
    chai
      .request(server)
      .keepOpen()
      .get("/api/issues/apitest?issue_title=Title&issue_text=Text")
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isNotEmpty(res.body);
        assert(
          res.body.every(function (element) {
            return (
              element._id &&
              element.issue_title === "Title" &&
              element.issue_text === "Text" &&
              element.created_on &&
              element.updated_on &&
              element.created_by &&
              element.project &&
              typeof element.open === "boolean" &&
              (element.assigned_to === null || element.assigned_to) &&
              (element.status_text === null || element.status_text)
            );
          })
        );

        done();
      });
  });

  test("Update one field on an issue", function (done) {
    chai
      .request(server)
      .keepOpen()
      .get("/api/issues/apitest")
      .end(function (err, res) {
        const { body } = res;

        chai
          .request(server)
          .keepOpen()
          .put("/api/issues/apitest")
          .send({ _id: body[0]._id, issue_title: "Title_Changed" })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.deepEqual(res.body, {
              result: "successfully updated",
              _id: body[0]._id,
            });

            chai
              .request(server)
              .keepOpen()
              .get(`/api/issues/apitest?_id=${body[0]._id}`)
              .end(function (err, res) {
                assert.equal(res.status, 200);
                assert.isArray(res.body);
                assert.equal(res.body.length, 1);
                assert.equal(res.body[0].issue_title, "Title_Changed");

                done();
              });
          });
      });
  });

  test("Update multiple fields on an issue", function (done) {
    chai
      .request(server)
      .keepOpen()
      .get("/api/issues/apitest")
      .end(function (err, res) {
        const { body } = res;

        chai
          .request(server)
          .keepOpen()
          .put("/api/issues/apitest")
          .send({
            _id: body[0]._id,
            issue_title: "Title_Changed_Again",
            issue_text: "Text_Changed",
          })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.deepEqual(res.body, {
              result: "successfully updated",
              _id: body[0]._id,
            });

            chai
              .request(server)
              .keepOpen()
              .get(`/api/issues/apitest?_id=${body[0]._id}`)
              .end(function (err, res) {
                assert.equal(res.status, 200);
                assert.isArray(res.body);
                assert.equal(res.body.length, 1);
                assert.equal(res.body[0].issue_title, "Title_Changed_Again");
                assert.equal(res.body[0].issue_text, "Text_Changed");

                done();
              });
          });
      });
  });

  test("Update an issue with missing _id", function (done) {
    chai
      .request(server)
      .keepOpen()
      .put("/api/issues/apitest")
      .send({
        issue_title: "Title_Changed_Again",
        issue_text: "Text_Changed_Again",
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { error: "missing _id" });

        done();
      });
  });

  test("Update an issue with no fields to update", function (done) {
    chai
      .request(server)
      .keepOpen()
      .get("/api/issues/apitest")
      .end(function (err, res) {
        const { body } = res;

        chai
          .request(server)
          .keepOpen()
          .put("/api/issues/apitest")
          .send({ _id: body[0]._id })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.deepEqual(res.body, {
              error: "no update field(s) sent",
              _id: body[0]._id,
            });

            done();
          });
      });
  });

  test("Update an issue with an invalid _id", function (done) {
    chai
      .request(server)
      .keepOpen()
      .put("/api/issues/apitest")
      .send({
        _id: "invalidId",
        issue_title: "Title_Changed_Again",
        issue_text: "Text_Changed_Again",
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, {
          error: "could not update",
          _id: "invalidId",
        });

        done();
      });
  });

  test("Delete an issue", function (done) {
    chai
      .request(server)
      .keepOpen()
      .get("/api/issues/apitest")
      .end(function (err, res) {
        const { body } = res;

        chai
          .request(server)
          .keepOpen()
          .delete("/api/issues/apitest")
          .send({ _id: body[0]._id })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.deepEqual(res.body, {
              result: "successfully deleted",
              _id: body[0]._id,
            });

            chai
              .request(server)
              .keepOpen()
              .get(`/api/issues/apitest?_id=${body[0]._id}`)
              .end(function (err, res) {
                assert.equal(res.status, 200);
                assert.isArray(res.body);
                assert.equal(res.body.length, 0);

                done();
              });
          });
      });
  });

  test("Delete an issue with an invalid _id", function (done) {
    chai
      .request(server)
      .keepOpen()
      .delete("/api/issues/apitest")
      .send({ _id: "invalidId" })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, {
          error: "could not delete",
          _id: "invalidId",
        });

        done();
      });
  });

  test("Delete an issue with missing _id", function (done) {
    chai
      .request(server)
      .keepOpen()
      .delete("/api/issues/apitest")
      .send({})
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { error: "missing _id" });

        done();
      });
  });
});
