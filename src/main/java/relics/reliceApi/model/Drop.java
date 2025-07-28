package relics.reliceApi.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Drop {
    private String itemName;
    private double chance;
    private Integer ducatValue;

    public String toString() {
        return "Drop{" +
                "itemName='" + itemName + '\'' +
                ", chance=" + chance +
                ", ducatValue=" + ducatValue +
                '}';
    }
}
