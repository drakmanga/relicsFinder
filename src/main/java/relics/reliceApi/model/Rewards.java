package relics.reliceApi.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class Rewards {
    private String _id;
    private String itemName;
    private String rarity;
    private String chance;

    public Rewards() {}
}
