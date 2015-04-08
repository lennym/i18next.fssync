var fs = require('fs'),
    path = require('path'),
    JSON5 = require('json5');

module.exports = {

    saveResourceSet: function (lng, ns, resourceSet, cb) {
        var filename = this.functions.applyReplacement(this.options.resSetPath, {lng: lng, ns: ns});

        try {
            fs.writeFileSync(filename, JSON.stringify(resourceSet, null, this.options.jsonIndent || 4));
            cb();
        } catch (e) {
            cb(e);
        }
    },

    fetchOne: function (lng, ns, cb) {

        var filename = this.functions.applyReplacement(this.options.resGetPath, {lng: lng, ns: ns});

        var self = this, data;
        try {
            data = fs.readFileSync(filename, 'utf8');
        } catch (e) {
            return cb(e);
        }

        self.functions.log('loaded file: ' + filename);

        try {
            var result = path.extname(filename) === '.json5' ?
                JSON5.parse(data.replace(/^\uFEFF/, '')) :
                JSON.parse(data.replace(/^\uFEFF/, '')); // strip byte-order mark
            cb(null, result);
        } catch (err) {
            err.message = 'error parsing ' + filename + ': ' + err.message;
            return cb(err);
        }

    },

    saveMissing: function (lng, ns, key, defaultValue, callback) {

        // add key to resStore
        var keys = key.split(this.options.keyseparator);
        var x = 0;
        var value = this.resStore[lng][ns];
        while (keys[x]) {
            if (x === keys.length - 1) {
                value = value[keys[x]] = defaultValue;
            } else {
                value = value[keys[x]] = value[keys[x]] || {};
            }
            x++;
        }

        var filename = this.functions.applyReplacement(this.options.resSetPath, {lng: lng, ns: ns});

        var self = this;
        this.saveResourceSet(lng, ns, this.resStore[lng][ns], function (err) {
            if (err) {
                self.functions.log('error saving missingKey `' + key + '` to: ' + filename);
            } else {
                self.functions.log('saved missingKey `' + key + '` with value `' + defaultValue + '` to: ' + filename);
            }
            if (typeof callback === 'function') {
                callback(err);
            }
        });
    },

    postChange: function (lng, ns, key, newValue, callback) {
        var self = this;
        this.load([lng], {ns: {namespaces: [ns]}}, function (err, fetched) {
            if (err) {
                return callback(err);
            }
            // change key in resStore
            var keys = key.split(self.options.keyseparator);
            var x = 0;
            var value = fetched[lng][ns];
            while (keys[x]) {
                if (x === keys.length - 1) {
                    value = value[keys[x]] = newValue;
                } else {
                    value = value[keys[x]] = value[keys[x]] || {};
                }
                x++;
            }

            var filename = self.functions.applyReplacement(self.options.resGetPath, {lng: lng, ns: ns});

            self.saveResourceSet(lng, ns, fetched[lng][ns], function (e) {
                if (e) {
                    self.functions.log('error updating key `' + key + '` with value `' + newValue + '` to: ' + filename);
                } else {
                    self.functions.log('updated key `' + key + '` with value `' + newValue + '` to: ' + filename);
                }
                if (typeof callback === 'function') {
                    callback(e);
                }
            });
        });
    },

    postRemove: function (lng, ns, key, callback) {
        var self = this;
        this.load([lng], {ns: {namespaces: [ns]}}, function (err, fetched) {
            if (err) {
                return callback(err);
            }
            // change key in resStore
            var keys = key.split(self.options.keyseparator);
            var x = 0;
            var value = fetched[lng][ns];
            while (keys[x]) {
                if (x === keys.length - 1) {
                    delete value[keys[x]];
                } else {
                    value = value[keys[x]] = value[keys[x]] || {};
                }
                x++;
            }

            var filename = self.functions.applyReplacement(self.options.resGetPath, {lng: lng, ns: ns});

            self.saveResourceSet(lng, ns, fetched[lng][ns], function (e) {
                if (e) {
                    self.functions.log('error removing key from: ' + filename);
                } else {
                    self.functions.log('removed key from: ' + filename);
                }
                if (typeof callback === 'function') {
                    callback(e);
                }
            });
        });
    }
};
