package dev.matswuuu.hse.scan;

import com.google.zxing.*;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.*;

/**
 * Reads codes from photos with ZXing: product barcodes (EAN/UPC, "Честный знак" DataMatrix)
 * and the fiscal QR code of a receipt. Works on JPEG/PNG; other formats simply decode to nothing.
 */
@Component
public class BarcodeDecoder {

    private static final Set<BarcodeFormat> PRODUCT_FORMATS = Set.of(
            BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
            BarcodeFormat.DATA_MATRIX);

    public record Decoded(String text, BarcodeFormat format) {}

    /** Any supported code on the image. */
    public Optional<Decoded> decode(byte[] image, Set<BarcodeFormat> formats) {
        BufferedImage bitmap = read(image);
        if (bitmap == null) {
            return Optional.empty();
        }
        Map<DecodeHintType, Object> hints = new EnumMap<>(DecodeHintType.class);
        hints.put(DecodeHintType.TRY_HARDER, Boolean.TRUE);
        hints.put(DecodeHintType.POSSIBLE_FORMATS, List.copyOf(formats));
        MultiFormatReader reader = new MultiFormatReader();
        reader.setHints(hints);
        LuminanceSource source = new BufferedImageLuminanceSource(bitmap);
        // Phone shots are often sideways: try the image as is, then rotated.
        for (int turn = 0; turn < 4; turn++) {
            try {
                Result result = reader.decodeWithState(new BinaryBitmap(new HybridBinarizer(source)));
                return Optional.of(new Decoded(result.getText(), result.getBarcodeFormat()));
            } catch (NotFoundException e) {
                if (!source.isRotateSupported()) {
                    break;
                }
                source = source.rotateCounterClockwise();
            }
        }
        return Optional.empty();
    }

    /** EAN/UPC digits of a product, from a linear barcode or the GTIN inside a DataMatrix code. */
    public Optional<String> productBarcode(byte[] image) {
        return decode(image, PRODUCT_FORMATS).map(BarcodeDecoder::toProductCode).filter(c -> !c.isEmpty());
    }

    /** Raw text of a receipt QR code ("t=…&s=…&fn=…&i=…&fp=…&n=1"). */
    public Optional<String> receiptQr(byte[] image) {
        return decode(image, Set.of(BarcodeFormat.QR_CODE)).map(Decoded::text).filter(t -> t.contains("fn="));
    }

    static String toProductCode(Decoded decoded) {
        String text = decoded.text().strip();
        if (decoded.format() == BarcodeFormat.DATA_MATRIX) {
            // GS1 marking code: "01" + 14-digit GTIN + "21" serial…; GTIN-14 with a leading 0 is an EAN-13.
            String plain = text.replace("\u001d", "");
            if (plain.length() >= 16 && plain.startsWith("01") && plain.substring(2, 16).chars().allMatch(Character::isDigit)) {
                String gtin = plain.substring(2, 16);
                return gtin.startsWith("0") ? gtin.substring(1) : gtin;
            }
            return "";
        }
        return text.chars().allMatch(Character::isDigit) ? text : "";
    }

    private static BufferedImage read(byte[] image) {
        try {
            return ImageIO.read(new ByteArrayInputStream(image));
        } catch (IOException | RuntimeException e) {
            return null;
        }
    }
}
