var rewire        = require("rewire"),
    path          = require("path"),
    fs            = require("fs-extra"),
    temp          = require("temp"),
    Immutable     = require("immutable"),
    TreeActions   = require("../src/actions/TreeActions"),
    TreeStore     = rewire("../src/stores/TreeStore");

// Automatically track and cleanup files at exit
temp.track();

describe("TreeStore", function () {
  beforeEach(function () {
    this.tempDir = temp.mkdirSync("file-tree-directory");
    // A file in the root folder
    fs.outputFileSync(this.tempDir + "/at_root", "");
    // Some files in a folder named 'z'
    fs.outputFileSync(this.tempDir + "/z/file_1", "");
    fs.outputFileSync(this.tempDir + "/z/file_2", "");
    fs.outputFileSync(this.tempDir + "/z/file_3", "");
    // A file in a deep folder
    fs.outputFileSync(this.tempDir + "/d/e/e/p/deep_1", "");

    TreeStore.__set__("_contentDir", this.tempDir);
  });

  afterEach(function () {
    TreeStore.removeAllChangeListeners();
  });

  describe("init", function () {
    it("emits a change event", function (done) {
      TreeStore.addChangeListener(done);
      TreeActions.init();
    });

    it("builds the root node", function () {
      TreeActions.init();
      var rootNode = TreeStore.getTree();
      expect(rootNode.get("name")).to.eql(path.basename(this.tempDir));
      expect(rootNode.get("path")).to.eql(".");
      expect(rootNode.get("children")).to.be.an.instanceof(Immutable.List);
    });
  });

  describe("expand", function () {
    beforeEach(function () {
      TreeActions.init();
    });

    it("marks the node as expanded", function () {
      expect(TreeStore.getTree().get("expanded")).to.be.false;
      TreeActions.expand(".");
      expect(TreeStore.getTree().get("expanded")).to.be.true;
    });

    it("expands its parents", function () {
      TreeActions.expand("d/e/e/p");
      expect(TreeStore.getNode(".").get("expanded")).to.be.true;
      expect(TreeStore.getNode("d").get("expanded")).to.be.true;
      expect(TreeStore.getNode("d/e").get("expanded")).to.be.true;
      expect(TreeStore.getNode("d/e/e").get("expanded")).to.be.true;
      expect(TreeStore.getNode("d/e/e/p").get("expanded")).to.be.true;
    });

    it("loads the node's children", function () {
      TreeActions.expand(".");
      expect(TreeStore.getTree().get("children").size).to.eql(3);
    });

    it("does not load children recursively", function () {
      TreeActions.expand(".");
      expect(TreeStore.getNode("d").get("children").size).to.eql(0);
    });

    it("ignores .git, .DS_Store and Thumbs.db nodes", function () {
      // Add some nodes to ignore
      fs.outputFileSync(this.tempDir + "/.DS_Store", "");
      fs.outputFileSync(this.tempDir + "/Thumbs.db", "");
      fs.ensureDirSync(this.tempDir + "/.git");

      TreeActions.expand(".");

      expect(TreeStore.getTree().get("children").size).to.eql(3)
    });

    it("sorts children folder first", function () {
      TreeActions.expand(".");

      var children = TreeStore.getTree().get("children");
      expect(children.getIn([0, "name"])).to.eql("d");
      expect(children.getIn([1, "name"])).to.eql("z");
      expect(children.getIn([2, "name"])).to.eql("at_root");
    });
  });

  describe("collapse", function () {
    beforeEach(function () {
      TreeActions.init();
      TreeActions.expand(".");
    });

    it("marks the node as collapsed", function () {
      expect(TreeStore.getTree().get("expanded")).to.be.true;
      TreeActions.collapse(".");
      expect(TreeStore.getTree().get("expanded")).to.be.false;
    });

    it("does not collapse its children", function () {
      TreeActions.expand("d");

      expect(TreeStore.getTree().get("expanded")).to.be.true;
      expect(TreeStore.getTree().getIn(["children", 0, "expanded"])).to.be.true;
      TreeActions.collapse(".");
      expect(TreeStore.getTree().getIn(["children", 0, "expanded"])).to.be.true;
    });
  });

  describe("watching for changes", function () {
    beforeEach(function () {
      TreeActions.init();
    });

    context("when a file is added to an expanded node", function () {
      beforeEach(function () {
        TreeActions.expand(".");
      });

      it("adds the new node to the tree", function (done) {
        TreeStore.addChangeListener(function () {
          expect(TreeStore.getTree().get("children").size).to.eql(4);
          done();
        });
        fs.outputFileSync(this.tempDir + "/new_file");
      });
    });

    context("when a file is deleted from an expanded node", function () {
      beforeEach(function () {
        TreeActions.expand("z");
      });

      it("removes the deleted node from the tree", function (done) {
        TreeStore.addChangeListener(function () {
          expect(TreeStore.getTree().get("children").size).to.eql(2);
          done();
        });
        fs.removeSync(this.tempDir + "/z");
      });

      it("re-indexes the node's children", function (done) {
        TreeStore.addChangeListener(function () {
          expect(TreeStore.getNode("z").get("children").size).to.eql(3);
          expect(TreeStore.getNode("z/file_2").get("name")).to.eql("file_2");
          done();
        });
        fs.removeSync(this.tempDir + "/d");
      });

      context("when an expanded node is deleted", function () {
        it("cleans up after itself");
      });
    });

    describe("collapsing a previously expanded node", function () {
      beforeEach(function () {
        TreeActions.expand(".");
      });

      it("stops watching for changes on the node", function (done) {
        TreeActions.collapse(".");
        fs.outputFileSync(this.tempDir + "/new_file");
        setTimeout(function () {
          expect(TreeStore.getTree().get("children").size).to.eql(3);
          done();
        }, 500);
      });

      context("with expanded children", function () {
        beforeEach(function () {
          TreeActions.expand("z");
          TreeActions.expand("d/e/e/p");
          TreeActions.collapse(".");
        });

        it("stops watching for changes on the expanded children", function (done) {
          fs.outputFileSync(this.tempDir + "/z/new_file");
          fs.outputFileSync(this.tempDir + "/d/e/e/p/new_file");
          setTimeout(function () {
            expect(TreeStore.getNode("z").get("children").size).to.eql(3);
            expect(TreeStore.getNode("d/e/e/p").get("children").size).to.eql(1);
            done();
          }, 500);
        });

        context("when re-expanding the node", function () {
          beforeEach(function () {
            TreeActions.expand(".");
          });

          it("restarts watching for changes on expanded children", function (done) {
            TreeStore.addChangeListener(function () {
              expect(TreeStore.getNode("z").get("children").size).to.eql(4);
              expect(TreeStore.getNode("d/e/e/p").get("children").size).to.eql(2);
              done();
            });
            fs.outputFileSync(this.tempDir + "/z/new_file");
            fs.outputFileSync(this.tempDir + "/d/e/e/p/new_file");
          });
        });
      });
    });

    context("when collapsed", function () {
      it("does not watch for changes", function () {
        fs.outputFileSync(this.tempDir + "/new_file");
        expect(TreeStore.getTree().get("children").size).to.eql(0);
      });
    });
  });
});
