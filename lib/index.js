//
// index.js
// @trenskow/atomic-write-stream
//
// Created by Kristian Trenskow on 2025/01/01
// See license in LICENSE.
//

import { createWriteStream } from 'fs';
import { rename, unlink, stat } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { randomBytes } from 'crypto';
import { PassThrough } from 'stream';

class AtomicStream extends PassThrough {

	constructor(path, { tmpDirectory } = {}) {

		super();

		tmpDirectory = tmpDirectory || dirname(path);

		this._path = path;
		this._birthPath = join(tmpDirectory, `.${basename(path)}.${randomBytes(4).toString('hex')}`);
		this._gravePath = join(tmpDirectory, `.${basename(path)}.${randomBytes(4).toString('hex')}`);

		this.once('error', () => this._cleanup());

	}

	_cleanup() {
		unlink(this._birthPath).catch(() => {});
	}

	_transform(chunk, encoding, callback) {
		callback(null, chunk, encoding);
	}

	_final(callback) {

		(async () => {

			let isOverwrite = true;

			try {
				await stat(this._path);
			} catch (_) {
				isOverwrite = false;
			}

			if (isOverwrite) {
				try {
					await rename(this._path, this._gravePath);
				} catch (error) {
					this._cleanup();
					throw error;
				}
			}

			try {
				await rename(this._birthPath, this._path);
			} catch (error) {

				if (isOverwrite) {
					await rename(this._gravePath, this._path);
				}

				this._cleanup();

				throw error;

			}

			if (isOverwrite) {

				try {
					await unlink(this._gravePath);
				} catch (_) { }

			}

		})().then(() => callback()).catch((error) => callback(error));

	}

};

export default (path, { tmpDirectory } = {}) => {

	const atomicStream = new AtomicStream(path, { tmpDirectory });
	const writeStream = createWriteStream(atomicStream._birthPath);

	atomicStream.pipe(writeStream);

	return atomicStream;

};
