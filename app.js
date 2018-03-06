const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express();

// middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
// mongo URI
const mongoURI = <Your mongo string>;

// create mongo connection
const conn = mongoose.createConnection(mongoURI);

// init gfs
let gfs;
conn.once('open', () => {
  // init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
})

// create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

// @route GET
// @desc loads form
app.get('/', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // check to see if files exists
    if (!files || files.length === 0) {
      res.render('index', {files: false});
    } else {
      files.map(file => {
        if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render('index', {files: files});
    }
  });
});

// @route POST/upload
// @desc uploads file to db
app.post('/upload', upload.single('file'), (req, res) => {
  //res.json({file: req.file});
  res.redirect('/');
})

// @route get  /files
// @desc display all files in JSON
app.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // check to see if files exists
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exists'
      });
    }

    // files exists
    return res.json(files);
  });
});


// @route get  /files\:filename
// @desc display single file object
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({filename: req.params.filename}, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
     // file exists
    return res.json(file);
  });
});

// @route get  /image\:filename
// @desc display image
app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({filename: req.params.filename}, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
     // check if content is image
     if (file.contentType === 'image/jpeg' || file.contentType === 'img/png') {
       // read output to browser
       const readstream = gfs.createReadStream(file.filename);
       readstream.pipe(res);
     } else {
       res.status(404).json({
         err: 'Not an image'
       })
     }
  });
});

// @route DELETE /files/:id
// @desc delete file
app.delete('/files/:id', (req, res) => {
  gfs.remove({_id: req.params.id, root: 'uploads'}, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err});
    }

    res.redirect('/');
  });
})
const port = 5000;

app.listen(port, () => console.log(`server started on port ${port}`));
