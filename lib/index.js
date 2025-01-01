//
// index.js
// @trenskow/atomic-write-stream
//
// Created by Kristian Trenskow on 2025/01/01
// See license in LICENSE.
//

import { createWriteStream } from 'fs';
import { rename, unlink, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { basename } from 'path';
import { randomBytes } from 'crypto';
import { PassThrough } from 'stream';

class AtomicStream extends PassThrough {

	constructor(path, { tmpDirectory = tmpdir() } = {}) {

		super();

		this._path = path;
		this._birthPath = `${tmpDirectory}/${basename(path)}.${randomBytes(4).toString('hex')}`;
		this._gravePath = `${tmpDirectory}/${basename(path)}.${randomBytes(4).toString('hex')}`;

		this.once('error', () => this._cleanup());

	}

	_cleanup() {
		unlink(this._birthPath).catch(() => {});
	}

	_finish(callback) {

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

export default (path, { tmpDirectory = tmpdir() } = {}) => {

	const writeStream = createWriteStream(path);
	const atomicStream = new AtomicStream(path, { tmpDirectory });

	atomicStream.pipe(writeStream);

	return atomicStream;

};
