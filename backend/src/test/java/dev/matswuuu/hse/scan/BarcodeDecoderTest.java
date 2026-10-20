package dev.matswuuu.hse.scan;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;

import static org.assertj.core.api.Assertions.assertThat;

class BarcodeDecoderTest {

    private final BarcodeDecoder decoder = new BarcodeDecoder();

    @Test
    void readsProductBarcode() throws Exception {
        assertThat(decoder.productBarcode(png("4607001771531", BarcodeFormat.EAN_13, 400, 200)))
                .contains("4607001771531");
    }

    @Test
    void readsReceiptQr() throws Exception {
        String qr = "t=20261018T1942&s=349.93&fn=9282440300682838&i=46534&fp=1273019065&n=1";
        assertThat(decoder.receiptQr(png(qr, BarcodeFormat.QR_CODE, 400, 400))).contains(qr);
        assertThat(decoder.productBarcode(png(qr, BarcodeFormat.QR_CODE, 400, 400))).isEmpty();
    }

    @Test
    void takesGtinFromMarkingCode() {
        var decoded = new BarcodeDecoder.Decoded("0104601234567893215abcde\u001d93dGVz", BarcodeFormat.DATA_MATRIX);
        assertThat(BarcodeDecoder.toProductCode(decoded)).isEqualTo("4601234567893");
    }

    @Test
    void ignoresGarbage() {
        assertThat(decoder.productBarcode(new byte[] {1, 2, 3})).isEmpty();
    }

    private static byte[] png(String text, BarcodeFormat format, int width, int height) throws Exception {
        var matrix = new MultiFormatWriter().encode(text, format, width, height);
        var out = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(matrix, "png", out);
        return out.toByteArray();
    }
}
