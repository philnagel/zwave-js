import { type ZWaveSerialBindingFactory } from "@zwave-js/serial";

export function createWebSerialPortFactory(
	port: SerialPort,
): ZWaveSerialBindingFactory {
	let writer: WritableStreamDefaultWriter<Uint8Array> | undefined;

	const sink: UnderlyingSink<Uint8Array> = {
		close() {
			writer?.releaseLock();
			port.close();
		},
		async write(chunk) {
			writer ??= port.writable!.getWriter();
			await writer.write(chunk);
		},
	};

	let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

	const source: UnderlyingDefaultSource<Uint8Array> = {
		async start(controller) {
			reader = port.readable!.getReader();
			try {
				while (true) {
					const { value, done } = await reader.read();
					if (done) {
						break;
					}
					controller.enqueue(value);
				}
			} finally {
				reader.releaseLock();
			}
		},
		async cancel() {
			await reader?.cancel();
		},
	};

	// Apparently the types flip-flop between being compatible and not being compatible
	// between the node and browser versions of the Web Streams API
	return () => Promise.resolve({ source, sink }) as any;
}
